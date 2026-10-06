import React, { useState, useEffect } from 'react';
import { Search, Globe, Network, FileText, Database, Share2, Play, CheckCircle } from 'lucide-react';

export default function IRSearch() {
  const [query, setQuery] = useState('federal reserve interest rate');
  const [searchLoading, setSearchLoading] = useState(false);
  const [passages, setPassages] = useState([]);
  const [pageRankData, setPageRankData] = useState(null);
  const [semanticTriples, setSemanticTriples] = useState([]);
  const [nerText, setNerText] = useState('The Federal Reserve maintained the benchmark rate at 5.25% in Q3 for Apple and Goldman Sachs.');
  const [nerResult, setNerResult] = useState(null);
  const [activeTab, setActiveTab] = useState('search'); // 'search', 'pagerank', 'semantic', 'ner'

  useEffect(() => {
    executeSearch();
    fetchPageRank();
    fetchSemanticGraph();
  }, []);

  const executeSearch = async () => {
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/ir/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.top_passages) setPassages(data.top_passages);
    } catch (e) {
      console.error(e);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchPageRank = async () => {
    try {
      const res = await fetch('/api/ir/pagerank');
      setPageRankData(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSemanticGraph = async () => {
    try {
      const res = await fetch('/api/ir/semantic-graph');
      const data = await res.json();
      if (data.triples) setSemanticTriples(data.triples);
    } catch (e) {
      console.error(e);
    }
  };

  const runNer = async () => {
    try {
      const res = await fetch('/api/ir/extract-entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: nerText })
      });
      setNerResult(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="container-custom" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div>
        <h2 className="font-heading" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
          Information Retrieval, Web Crawling & Semantic Web Console
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Unit IV (Language Models & Smoothing), Unit V (Crawling, MapReduce & PageRank), Unit VI (Semantic Web RDF Triples & NER).
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('search')}
          className={`btn-secondary ${activeTab === 'search' ? 'glass-panel-active' : ''}`}
          style={{ borderColor: activeTab === 'search' ? '#8b5cf6' : undefined }}
        >
          <Search size={16} /> Unit IV: Language Model Passage Search
        </button>

        <button
          onClick={() => setActiveTab('pagerank')}
          className={`btn-secondary ${activeTab === 'pagerank' ? 'glass-panel-active' : ''}`}
          style={{ borderColor: activeTab === 'pagerank' ? '#06b6d4' : undefined }}
        >
          <Globe size={16} /> Unit V: Crawler & PageRank Graph
        </button>

        <button
          onClick={() => setActiveTab('semantic')}
          className={`btn-secondary ${activeTab === 'semantic' ? 'glass-panel-active' : ''}`}
          style={{ borderColor: activeTab === 'semantic' ? '#10b981' : undefined }}
        >
          <Network size={16} /> Unit VI: Semantic Web RDF Triples
        </button>

        <button
          onClick={() => setActiveTab('ner')}
          className={`btn-secondary ${activeTab === 'ner' ? 'glass-panel-active' : ''}`}
          style={{ borderColor: activeTab === 'ner' ? '#f59e0b' : undefined }}
        >
          <FileText size={16} /> Unit VI: Financial Named Entity Recognition
        </button>
      </div>

      {/* Tab 1: Language Model Passage Search */}
      {activeTab === 'search' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Search Box */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search financial disclosures (e.g. federal reserve interest rate)..."
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '0.95rem'
                }}
              />
              <button onClick={executeSearch} className="btn-primary" disabled={searchLoading}>
                <Search size={16} /> {searchLoading ? 'Ranking...' : 'Search Passages'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.75rem', color: '#94a3b8' }}>
              <span>Multinomial Dirichlet Prior: μ = 1500</span>
              <span>•</span>
              <span>Jelinek-Mercer Interpolation: λ = 0.35</span>
              <span>•</span>
              <span>Sliding Passage Window: L = 40 tokens</span>
            </div>
          </div>

          {/* Search Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {passages.map((p, idx) => (
              <div key={idx} className="glass-panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: '#38bdf8' }}>{p.title}</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span className="badge badge-cyan">Dirichlet: {p.dirichlet_score}</span>
                    <span className="badge badge-emerald">Matches: {p.query_term_matches}</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                  "{p.passage_text}"
                </p>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Doc ID: {p.doc_id} • Passage Range: tokens [{p.passage_range}]
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: PageRank */}
      {activeTab === 'pagerank' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
            PageRank Power Iteration on Financial Web Graph
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
            Calculates the stationary authority distribution over crawled financial portals: PR(p_i) = (1-d)/N + d · Σ (PR(p_j)/L(p_j))
          </p>

          {pageRankData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pageRankData.ranked_pages.map(page => (
                <div
                  key={page.rank}
                  style={{
                    padding: '0.85rem 1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span className="badge badge-cyan" style={{ marginRight: '0.75rem' }}>Rank #{page.rank}</span>
                    <span className="font-mono" style={{ fontSize: '0.85rem', color: '#f8fafc' }}>{page.url}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: '#34d399', fontSize: '0.9rem' }}>
                      {page.authority_percentage}% Authority
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      PR Score: {page.pagerank_score}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Semantic Web */}
      {activeTab === 'semantic' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
            Semantic Web & RDF Triples Knowledge Graph
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
            Structured representation using RDF Triples (Subject, Predicate, Object) enabling ontological graph reasoning.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.75rem' }}>
            {semanticTriples.map((t, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.85rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  fontSize: '0.8rem'
                }}
              >
                <div style={{ color: '#38bdf8', fontWeight: 600 }}>{t.subject}</div>
                <div className="font-mono" style={{ color: '#c084fc', margin: '0.2rem 0' }}>➔ {t.predicate}</div>
                <div style={{ color: '#34d399' }}>➔ {t.object}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: NER */}
      {activeTab === 'ner' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
            Financial Named Entity Recognition (NER) & Fact Extraction
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
            Extracts organizations, monetary rates, and market facts from regulatory text.
          </p>

          <textarea
            value={nerText}
            onChange={(e) => setNerText(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.9rem',
              marginBottom: '1rem'
            }}
          />

          <button onClick={runNer} className="btn-primary" style={{ marginBottom: '1rem' }}>
            <Play size={16} /> Extract Financial Entities
          </button>

          {nerResult && (
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ color: '#38bdf8' }}>Organizations: </strong>
                {nerResult.entities_found.organizations.join(', ') || 'None'}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ color: '#34d399' }}>Monetary / Rates: </strong>
                {nerResult.entities_found.monetary_and_rates.join(', ') || 'None'}
              </div>
              <div>
                <strong style={{ color: '#c084fc' }}>Potential Tickers: </strong>
                {nerResult.entities_found.potential_tickers.join(', ') || 'None'}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
