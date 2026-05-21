import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;

    // Look up the skill by slug
    const { data: skill, error } = await supabase
      .from("soul_skills")
      .select("skill_md, soul_md, calibration_md, readme_md, skill_name, slug, visibility, version")
      .eq("slug", slug)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (error || !skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // Only serve public skills without auth; private skills need auth
    if (skill.visibility !== "public") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return NextResponse.json(
          { error: "This skill is private. Please authenticate." },
          { status: 401 }
        );
      }
      const authRes = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (authRes.error) {
        return NextResponse.json({ error: authRes.error.message }, { status: 401 });
      }
    }

    // Build tar.gz in-memory
    const tarBuffer = await buildTarGz(skill);

    return new NextResponse(tarBuffer, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${skill.slug}.tar.gz"`,
      },
    });
  } catch (err: any) {
    console.error("Skill download error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function encodeHeader(name: string, size: number, mtime = Date.now() / 1000 | 0): Buffer {
  const header = Buffer.alloc(512);
  header.fill(0);
  const nameBuf = Buffer.from(name, "ascii");
  nameBuf.copy(header, 0);
  writeOctal(header, 100 + 16, 8, 100);
  writeOctal(header, 0, 8, 108);
  writeOctal(header, 0, 8, 116);
  writeOctal(header, size, 12, 124);
  writeOctal(header, mtime, 12, 136);
  header.writeUInt8(32, 148);
  header.writeUInt8(32, 149);
  header.writeUInt8(0, 150);
  header.writeUInt8(0, 151);
  header.writeUInt8(0, 152);
  header.writeUInt8(0, 153);
  header.writeUInt8(0, 154);
  header.writeUInt8(0, 155);
  header.writeUInt8(48, 156);
  let chk = 0;
  for (let i = 0; i < 512; i++) chk += header[i];
  const chkStr = chk.toString(8) + "  \0";
  Buffer.from(chkStr).copy(header, 148);
  return header;
}

function writeOctal(buf: Buffer, value: number, len: number, offset: number) {
  const oct = value.toString(8) + "\0 ";
  Buffer.from(oct).copy(buf, offset, 0, Math.min(oct.length, len));
  buf[offset + len - 1] = 0;
}

async function buildTarGz(skill: any): Promise<Buffer> {
  const zlib = await import("zlib");
  const files = [
    { name: "SKILL.md", content: skill.skill_md || "" },
    { name: "soul.md", content: skill.soul_md || "" },
    { name: "calibration.md", content: skill.calibration_md || "" },
    { name: "README.md", content: skill.readme_md || "" },
  ];
  const chunks: Buffer[] = [];
  for (const file of files) {
    const contentBuf = Buffer.from(file.content, "utf-8");
    const header = encodeHeader(file.name + "\0", contentBuf.length);
    chunks.push(header);
    const paddedLen = Math.ceil(contentBuf.length / 512) * 512;
    const padded = Buffer.alloc(paddedLen);
    contentBuf.copy(padded);
    chunks.push(padded);
  }
  chunks.push(Buffer.alloc(1024));
  const tarBuffer = Buffer.concat(chunks);
  return new Promise((resolve, reject) => {
    zlib.gzip(tarBuffer, (err, compressed) => {
      if (err) reject(err);
      else resolve(compressed);
    });
  });
}
