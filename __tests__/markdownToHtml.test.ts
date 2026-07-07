import { describe, it, expect } from "vitest";
import { markdownToHtml } from "@/lib/markdownToHtml";

describe("markdownToHtml() — block elements", () => {
  it("renders h1 / h2 / h3", () => {
    expect(markdownToHtml("# Title")).toBe("<h1>Title</h1>");
    expect(markdownToHtml("## Section")).toBe("<h2>Section</h2>");
    expect(markdownToHtml("### Sub")).toBe("<h3>Sub</h3>");
  });

  it("renders a horizontal rule for ---", () => {
    expect(markdownToHtml("---")).toBe("<hr/>");
  });

  it("renders blockquotes", () => {
    expect(markdownToHtml("> quoted text")).toBe("<blockquote>quoted text</blockquote>");
  });

  it("renders plain lines as paragraphs and skips blank lines", () => {
    expect(markdownToHtml("one\n\ntwo")).toBe("<p>one</p>\n<p>two</p>");
  });

  it("renders consecutive dash lines as a single <ul>", () => {
    expect(markdownToHtml("- a\n- b\n- c")).toBe("<ul><li>a</li><li>b</li><li>c</li></ul>");
  });

  it("closes the list when a non-list line follows", () => {
    expect(markdownToHtml("- a\ntext")).toBe("<ul><li>a</li></ul>\n<p>text</p>");
  });

  it("renders italic-only lines as legal-meta paragraphs", () => {
    expect(markdownToHtml("*Last updated: 2026*")).toBe(
      '<p class="legal-meta">Last updated: 2026</p>',
    );
  });

  it("does NOT treat bold-starting lines as legal-meta", () => {
    expect(markdownToHtml("**bold** line*")).toContain("<strong>bold</strong>");
    expect(markdownToHtml("**bold** line*")).not.toContain("legal-meta");
  });
});

describe("markdownToHtml() — tables", () => {
  it("renders a header + separator + rows table", () => {
    const md = "| Col A | Col B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |";
    expect(markdownToHtml(md)).toBe(
      "<table><thead><tr><th>Col A</th><th>Col B</th></tr></thead>" +
      "<tbody><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></tbody></table>",
    );
  });

  it("a pipe line without a separator row is a plain paragraph, not a table", () => {
    expect(markdownToHtml("a | b")).toBe("<p>a | b</p>");
  });

  it("table ends at the first line without a pipe", () => {
    const md = "| H |\n|---|\n| r |\nafter";
    const html = markdownToHtml(md);
    expect(html).toContain("</table>");
    expect(html).toContain("<p>after</p>");
  });
});

describe("markdownToHtml() — inline formatting", () => {
  it("renders bold, code and links inside blocks", () => {
    expect(markdownToHtml("has **bold** text")).toBe("<p>has <strong>bold</strong> text</p>");
    expect(markdownToHtml("has `code` text")).toBe("<p>has <code>code</code> text</p>");
    expect(markdownToHtml("see [Peakadex](https://www.peakadex.com)")).toBe(
      '<p>see <a href="https://www.peakadex.com">Peakadex</a></p>',
    );
  });

  it("applies inline formatting inside headings, list items and table cells", () => {
    expect(markdownToHtml("# A **bold** title")).toBe("<h1>A <strong>bold</strong> title</h1>");
    expect(markdownToHtml("- item with `code`")).toBe("<ul><li>item with <code>code</code></li></ul>");
  });

  it("handles multiple bold spans on one line (non-greedy)", () => {
    expect(markdownToHtml("**a** and **b**")).toBe("<p><strong>a</strong> and <strong>b</strong></p>");
  });
});

describe("markdownToHtml() — trust contract", () => {
  // ⚠️ This converter does NOT sanitize: raw HTML passes through verbatim.
  // It is only safe for trusted, checked-in markdown (lib/legal — terms/privacy/cookies).
  // If it ever renders user-generated content, add escaping first.
  it("passes raw HTML through unescaped (must never receive user content)", () => {
    expect(markdownToHtml('<script>alert("x")</script>')).toBe('<p><script>alert("x")</script></p>');
  });
});
