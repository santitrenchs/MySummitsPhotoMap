function inline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

export function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("# "))  { out.push(`<h1>${inline(line.slice(2))}</h1>`); i++; continue; }
    if (line.startsWith("## ")) { out.push(`<h2>${inline(line.slice(3))}</h2>`); i++; continue; }
    if (line.startsWith("### ")){ out.push(`<h3>${inline(line.slice(4))}</h3>`); i++; continue; }

    if (line.trim() === "---")  { out.push("<hr/>"); i++; continue; }

    if (line.startsWith("> ")) {
      out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
      i++; continue;
    }

    // Table: header row followed by separator row
    if (line.includes("|") && lines[i + 1]?.match(/^\|[-| :]+\|/)) {
      const headers = line.split("|").filter(c => c.trim())
        .map(c => `<th>${inline(c.trim())}</th>`).join("");
      i += 2;
      const rows: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        const cells = lines[i].split("|").filter(c => c.trim())
          .map(c => `<td>${inline(c.trim())}</td>`).join("");
        rows.push(`<tr>${cells}</tr>`);
        i++;
      }
      out.push(`<table><thead><tr>${headers}</tr></thead><tbody>${rows.join("")}</tbody></table>`);
      continue;
    }

    // Unordered list
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(`<li>${inline(lines[i].slice(2))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (line.trim() === "") { i++; continue; }

    // Skip italic-only lines like *text* that are just metadata
    if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
      out.push(`<p class="legal-meta">${line.slice(1, -1)}</p>`);
      i++; continue;
    }

    out.push(`<p>${inline(line)}</p>`);
    i++;
  }

  return out.join("\n");
}
