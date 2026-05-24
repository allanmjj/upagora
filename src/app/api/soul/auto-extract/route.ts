import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, language = 'cn' } = body;

  if (!name || name.trim().length < 2) {
    return NextResponse.json({ error: 'Name required (min 2 characters)' }, { status: 400 });
  }

  try {
    // Step 1: Search for public information
    console.log(`[auto-extract] Searching for: ${name}`);
    const searchResults = await searchPerson(name);

    if (searchResults.length === 0) {
      return NextResponse.json({ error: 'No public data found for this person' }, { status: 404 });
    }

    // Step 2: Extract detailed content from top sources
    const contentSources = [searchResults[0].url]; // Extract from top source
    const extractedData = await extractPersonData(contentSources);

    // Step 3: Synthesize soul profile using LLM
    const soulProfile = await synthesizeSoulProfile(name, extractedData, language);

    if (!soulProfile) {
      return NextResponse.json({ error: 'Failed to synthesize soul profile' }, { status: 500 });
    }

    // Step 4: Create soul session in database
    const session = await createSoulSession(name, soulProfile, searchResults);

    return NextResponse.json({
      success: true,
      session: session,
    });

  } catch (error) {
    console.error('[auto-extract] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 });
  }
}

// ============================================
// Search for person's public information
// ============================================
async function searchPerson(name: string) {
  const searchQueries = [
    `${name}`, // General search
    `${name} biography`, // Biography
    `${name} interview`, // Interviews
    `${name} quotes`, // Quotes
    `${name} Wikipedia`, // Wikipedia
  ];

  let allResults: any[] = [];
  const limitPerQuery = 3;

  for (const query of searchQueries) {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[search] Wikipedia summary for ${name}:`, data.title);
        allResults.push({
          title: data.title,
          description: data.description,
          url: data.content_urls?.desktop?.page || data.content_urls?.mobile?.page,
          extract: data.extract,
        });
      }
    } catch (err) {
      console.log(`[search] Wikipedia failed:`, err);
    }

    // Also search via DuckDuckGo lite
    try {
      const ddgUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(ddgUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (response.ok) {
        const text = await response.text();
        // Simple extraction: find <a> tags in results
        const matches = text.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/g) || [];
        const newResults = matches.slice(0, limitPerQuery).map((match) => {
          const href = match.match(/href="([^"]*)"/)?.[1] || '';
          const title = match.match(/>([^<]+)</)?.[1] || '';
          return { title, url: href, description: '', extract: '' };
        });
        allResults = [...allResults, ...newResults];
      }
    } catch (err) {
      console.log(`[search] DuckDuckGo failed:`, err);
    }
  }

  // Remove duplicates by URL
  const seen = new Set();
  const results = allResults.filter((r) => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  }).slice(0, 10);

  console.log(`[search] Found ${results.length} results for ${name}`);
  return results;
}

// ============================================
// Extract detailed content from sources
// ============================================
async function extractPersonData(urls: string[]) {
  let fullContent = '';

  for (const url of urls) {
    if (!url || !url.startsWith('http')) continue;

    try {
      // Use Wikipedia API for structured Wikipedia content
      if (url.includes('wikipedia.org') || url.includes('wiki')) {
        const apiUrl = url.replace('/wiki/', '/api/rest_v1/page/summary/');
        const response = await fetch(apiUrl, {
          headers: { 'Accept': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.extract) {
            fullContent += `\n[FROM: ${url}]\n${data.extract}\n`;
          }
        }
      }

      // Also try direct fetch for other sources
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
          let html = await response.text();
          // Strip basic HTML tags
          html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
          html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
          html = html.replace(/<[^>]+>/g, ' ');
          html = html.replace(/\s+/g, ' ').trim();
          fullContent += `\n[FROM: ${url}]\n${html.substring(0, 5000)}\n`;
        }
      } catch (err) {
        // Ignore direct fetch errors
      }

    } catch (err) {
      console.log(`[extract] Failed to extract from:`, url, err);
    }
  }

  console.log(`[extract] Extracted ${fullContent.length} characters`);
  return fullContent;
}

// ============================================
// Synthesize soul profile using LLM
// ============================================
async function synthesizeSoulProfile(name: string, extractedData: string, language: string) {
  if (!extractedData || extractedData.length < 100) {
    throw new Error('Not enough data extracted for soul synthesis');
  }

  // Deep query the LLM to analyze public information
  const prompt = `You are a personality analysis expert. Analyze the following public information about ${name} and extract their personality profile across 7 dimensions.

Public Information about ${name}:
---
${extractedData}
---

Please analyze and output in JSON format:

1. cognitive_patterns: How does this person think? Logical? Intuitive? Systematic? Creative?
2. value_judgment: What values matter most to them? What do they prioritize?
3. expression_style: How do they speak? How do they write? What's their communication style?
4. knowledge_structure: What areas are they knowledgeable about? What's their expertise?
5. emotional_response: How do they react emotionally? Calm? Passionate? Protective?
6. relationship_memory: How do they view relationships? Family? Friends? Mentors?
7. life_narrative: What's their life story? Key turning points? Legacy?

For each dimension, provide:
- score: 0-1 score (how confident we are)
- insights: Array of 2-3 key personality traits or patterns
- evidence: Array of 2-3 quotes or evidence from the text

Use "${language === 'cn' ? '中文' : 'English'}" for the analysis values.

Output ONLY valid JSON with this structure:
{
  "dimensions": [
    {
      "name": "cognitive_patterns",
      "score": 0.8,
      "insights": ["trait1", "trait2"],
      "evidence": ["quote1", "quote2"]
    },
    // ... 7 dimensions total
  ],
  "personality_overview": "Brief 2-3 sentence personality summary",
  "signature_quotes": ["Quote 1", "Quote 2", "Quote 3"]
}`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a personality analysis expert. You always output valid JSON arrays.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('LLM returned empty response');
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from LLM response');
    }

    const soulProfile = JSON.parse(jsonMatch[0]);
    console.log(`[synthesize] Soul profile generated for ${name}`);
    return soulProfile;

  } catch (error) {
    console.error(`[synthesize] LLM synthesis failed:`, error);
    throw error;
  }
}

// ============================================
// Create soul session in database
// ============================================
async function createSoulSession(name: string, soulProfile: any, sources: any[]) {
  try {
    // Create soul through quick-extract API first
    const quickExtractResponse = await fetch(`http://localhost:3000/api/soul/quick-extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: soulProfile.personality_overview,
        source: 'auto-extract',
      }),
    });

    if (!quickExtractResponse.ok) {
      throw new Error('Failed to create soul session via quick-extract');
    }

    const session = await quickExtractResponse.json();

    // Update session with soul profile
    try {
      await fetch(`http://localhost:3000/api/soul/${encodeURIComponent(session.session.id || session.session_id)}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personality_overview: soulProfile.personality_overview,
          dimensions: soulProfile.dimensions,
          signature_quotes: soulProfile.signature_quotes,
          source: 'auto-extract',
          sources: sources,
        }),
      });
    } catch (err) {
      console.log('[create-socket] Soul profile update failed (non-critical):', err);
    }

    return session;

  } catch (error) {
    console.error('[create-socket] Failed to create soul:', error);
    throw error;
  }
}
