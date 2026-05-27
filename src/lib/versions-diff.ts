export function unifiedDiff(oldText: string, newText: string): { line: string; tag: "+" | "-" | " " }[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: { line: string; tag: "+" | "-" | " " }[] = [];

  // LCS-based diff (simple but effective for small texts)
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack to reconstruct diff
  let i = m;
  let j = n;
  const staged: { line: string; tag: "+" | "-" | " " }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      staged.unshift({ line: oldLines[i - 1], tag: " " });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      staged.unshift({ line: newLines[j - 1], tag: "+" });
      j--;
    } else if (i > 0) {
      staged.unshift({ line: oldLines[i - 1], tag: "-" });
      i--;
    }
  }

  return staged;
}

export function highlightSections(diff: ReturnType<typeof unifiedDiff>) {
  // Group consecutive same-tag lines into hunks
  const sections: { tag: "+" | "-" | " "; lines: string[] }[] = [];
  let current: { tag: "+" | "-" | " "; lines: string[] } | null = null;

  for (const item of diff) {
    if (!current || current.tag !== item.tag) {
      current = { tag: item.tag, lines: [item.line] };
      sections.push(current);
    } else {
      current.lines.push(item.line);
    }
  }
  return sections;
}
