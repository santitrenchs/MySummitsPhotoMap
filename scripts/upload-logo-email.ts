import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="84" height="84">
  <path d="M15 3 Q20.5 9 15 15 Q9.5 9 15 3Z" fill="#2F7A5F"/>
  <path d="M26.4 11.3 Q22.4 18.4 15 15 Q19 7.9 26.4 11.3Z" fill="#2F7A5F"/>
  <path d="M22.1 24.7 Q14.1 23.1 15 15 Q23 16.6 22.1 24.7Z" fill="#2F7A5F"/>
  <path d="M7.9 24.7 Q7 16.6 15 15 Q15.9 23.1 7.9 24.7Z" fill="#2F7A5F"/>
  <path d="M3.6 11.3 Q11 7.9 15 15 Q7.6 18.4 3.6 11.3Z" fill="#2F7A5F"/>
  <circle cx="15" cy="15" r="4" fill="white"/>
  <circle cx="15" cy="15" r="4" fill="none" stroke="#2F7A5F" stroke-width="0.8" opacity="0.5"/>
</svg>`;

async function main() {
  const png = await sharp(Buffer.from(svg)).resize(84, 84).png().toBuffer();

  const r2 = new S3Client({
    region: "auto",
    endpoint: "https://d25f1759d069e8d3853a228bfbb489a3.r2.cloudflarestorage.com",
    credentials: {
      accessKeyId: "a7b9bc6068933c3f7504c0c4afbbc1de",
      secretAccessKey: "e5f28fc526df8d525faccf6a1f198d47ad45d80f23edbbcd8a30b071af312f9e",
    },
  });

  await r2.send(new PutObjectCommand({
    Bucket: "mysummits",
    Key: "logo-email-v2.png",
    Body: png,
    ContentType: "image/png",
  }));

  console.log("logo-email.png uploaded OK");
}

main().catch(e => { console.error(e); process.exit(1); });
