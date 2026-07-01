// Global storefront footer: attribution + a light open-source nudge. The people
// browsing the live demo are exactly the audience likely to star the repo, so
// the ask lives here rather than on the portfolio.
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="footer-note">
        <span className="footer-brand">R² Commerce</span> is an open-source demo by{" "}
        <a href="https://github.com/rob0pup" target="_blank" rel="noopener">
          Robin
        </a>
        . Built with Medusa, pgvector, and Gemini.
      </p>
      <a
        className="footer-star"
        href="https://github.com/rob0pup/r2-commerce"
        target="_blank"
        rel="noopener"
      >
        <span aria-hidden>★</span> Star it on GitHub
      </a>
      <p className="footer-note">
        More by R²:{" "}
        <a href="https://compress.robinrahman.pro" target="_blank" rel="noopener">
          Squish
        </a>{" "}
        ·{" "}
        <a href="https://youloader.robinrahman.pro" target="_blank" rel="noopener">
          Youloader
        </a>{" "}
        ·{" "}
        <a href="https://robinrahman.pro" target="_blank" rel="noopener">
          Portfolio
        </a>
      </p>
    </footer>
  )
}
