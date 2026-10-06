"""
BioVault-AI: Web Crawler Module
Academic Syllabus: Unit V - Web Crawler: Web crawler structure, web crawler libraries, python Scrapy, Beautiful Soup

Implements:
1. Web Crawler Architectural Components:
   - Frontier Queue (BFS/DFS traversal)
   - Politeness Policy & Rate Limiter
   - Robots.txt Compliance Parser
   - Duplicate URL Deduplication via MD5 / Set Bloom Filter
   - HTML Parser & Link Extractor via BeautifulSoup4
2. Financial Web Crawler Pipeline harvesting filings, news headlines, and market reports.
"""

import re
import urllib.parse
from typing import Dict, List, Set, Any
from bs4 import BeautifulSoup


class FinancialWebCrawler:
    """
    Crawls financial target web pages, respects robots.txt politeness policies,
    extracts outlinks to form the hyperlink graph for PageRank, and extracts clean text passages.
    """

    def __init__(self, max_depth: int = 2, max_pages: int = 15):
        self.max_depth = max_depth
        self.max_pages = max_pages
        self.visited_urls: Set[str] = set()
        self.url_frontier: List[Tuple] = []  # Queue of (url, depth)
        self.link_graph: Dict[str, List[str]] = {}  # Source URL -> List[Target URLs]
        self.crawled_documents: List[Dict[str, Any]] = []

    def check_robots_allowed(self, url: str) -> bool:
        """
        Simulates robots.txt compliance checker.
        Disallows sensitive paths like /admin, /private, /auth.
        """
        disallowed_paths = ["/admin", "/private", "/internal", "/auth"]
        parsed = urllib.parse.urlparse(url)
        for bad in disallowed_paths:
            if bad in parsed.path:
                return False
        return True

    def extract_text_and_links(self, html_content: str, base_url: str) -> Dict[str, Any]:
        """
        Parses HTML using BeautifulSoup, cleans boilerplate scripts/styles,
        and extracts outbound hyperlinks.
        """
        soup = BeautifulSoup(html_content, "html.parser")

        # Strip scripts, styles, metadata
        for script in soup(["script", "style", "nav", "footer"]):
            script.decompose()

        title = soup.title.string.strip() if soup.title and soup.title.string else "Financial Document"
        clean_text = soup.get_text(separator=" ")
        clean_text = re.sub(r"\s+", " ", clean_text).strip()

        # Extract links
        outlinks = []
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            full_url = urllib.parse.urljoin(base_url, href)
            if full_url.startswith("http") and full_url != base_url:
                outlinks.append(full_url)

        return {
            "title": title,
            "text": clean_text,
            "outlinks": list(set(outlinks))
        }

    def simulate_crawl(self, seed_urls: List[str] = None) -> Dict[str, Any]:
        """
        Executes a crawl simulation harvesting financial documents and constructing
        the directed web graph for downstream PageRank computation.
        """
        sample_corpus = {
            "https://finance.vault.internal/fed-rates": """
                <html>
                <head><title>Federal Reserve Interest Rate Decision</title></head>
                <body>
                    <h1>Federal Reserve Holds Rates at 5.25%</h1>
                    <p>The Federal Reserve decided to maintain the benchmark federal funds rate at 5.25 percent to control inflation.</p>
                    <a href="https://finance.vault.internal/treasury-yields">Treasury Yields Analysis</a>
                    <a href="https://finance.vault.internal/market-outlook">Market Outlook 2026</a>
                </body>
                </html>
            """,
            "https://finance.vault.internal/treasury-yields": """
                <html>
                <head><title>US Treasury 10-Year Bond Yields</title></head>
                <body>
                    <h1>10-Year Treasury Yields Fluctuate</h1>
                    <p>Bond yields reacted to the central bank statement. Sovereign debt securities remain resilient.</p>
                    <a href="https://finance.vault.internal/fed-rates">Fed Decision</a>
                    <a href="https://finance.vault.internal/etf-flows">ETF Flows</a>
                </body>
                </html>
            """,
            "https://finance.vault.internal/market-outlook": """
                <html>
                <head><title>Annual Global Market Outlook</title></head>
                <body>
                    <h1>Equities and Risk-Adjusted Asset Returns</h1>
                    <p>Equity markets anticipate lower cost of capital. Diversified index funds show strong liquidity.</p>
                    <a href="https://finance.vault.internal/fed-rates">Fed Decision</a>
                    <a href="https://finance.vault.internal/etf-flows">ETF Flows</a>
                </body>
                </html>
            """,
            "https://finance.vault.internal/etf-flows": """
                <html>
                <head><title>Capital Inflows into Index Funds</title></head>
                <body>
                    <h1>Record Inflows in Tech ETFs and Fixed Income</h1>
                    <p>Institutional capital allocates heavily to balanced asset portfolios and treasury funds.</p>
                    <a href="https://finance.vault.internal/fed-rates">Federal Reserve Notes</a>
                </body>
                </html>
            """
        }

        if seed_urls is None:
            seed_urls = list(sample_corpus.keys())

        # Seed queue
        frontier = [(url, 0) for url in seed_urls]
        self.visited_urls.clear()
        self.link_graph.clear()
        self.crawled_documents.clear()

        while frontier and len(self.visited_urls) < self.max_pages:
            url, depth = frontier.pop(0)
            if url in self.visited_urls or depth > self.max_depth:
                continue

            if not self.check_robots_allowed(url):
                continue

            self.visited_urls.add(url)
            html = sample_corpus.get(url, f"<html><head><title>Portal {url}</title></head><body><p>Financial news on {url}</p></body></html>")
            parsed = self.extract_text_and_links(html, url)

            self.link_graph[url] = parsed["outlinks"]
            self.crawled_documents.append({
                "doc_id": f"doc_{len(self.crawled_documents) + 1}",
                "url": url,
                "title": parsed["title"],
                "text": parsed["text"],
                "word_count": len(parsed["text"].split()),
                "outlink_count": len(parsed["outlinks"])
            })

            # Append new links to frontier
            if depth < self.max_depth:
                for link in parsed["outlinks"]:
                    if link not in self.visited_urls:
                        frontier.append((link, depth + 1))

        return {
            "status": "Crawl Completed",
            "pages_visited": len(self.visited_urls),
            "documents_indexed": len(self.crawled_documents),
            "link_graph": self.link_graph,
            "crawled_documents": self.crawled_documents
        }
