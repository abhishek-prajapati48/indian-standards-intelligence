import { useState } from 'react';
import api from '../services/api.js';

export default function Recommendations() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    if (!query.trim()) return;
    setLoading(true); setError('');
    try {
      const response = await api.post('/recommendations/generate', { query, limit: 8 });
      setData(response.data.data);
    } catch (e) {
      setData(null);
      setError(e.response?.data?.message || 'Recommendation engine unavailable');
    } finally { setLoading(false); }
  }

  return  (
  <div className="recommendations-page">

    {/* Header */}
    <div className="recommendations-header">
      <h1>AI Standards Recommendations</h1>

      <p>
        Ask a procurement requirement in natural language. The engine
        retrieves evidence first, then generates a source-backed recommendation.
      </p>
    </div>


    {/* Query */}
    <div className="recommendation-query-card">

      <div className="recommendation-query-row">

        <div className="recommendation-query">

          <label>
            Procurement requirement
          </label>

          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Example: What standards should I consider for pharmaceutical regulatory safety and testing?"
          />

        </div>

        <button
          className="recommend-button"
          onClick={generate}
          disabled={loading || !query.trim()}
        >
          {loading ? "Analyzing..." : "Recommend"}
        </button>

      </div>

    </div>


    {/* Error */}
    {error && (
      <div className="recommendation-section">
        <div className="recommendation-empty">
          {error}
        </div>
      </div>
    )}


    {/* Results */}
    {data && (

      <div>

        {/* AI Analysis */}
        <div className="recommendation-section">

          <div className="recommendation-section-header">

            <h2>
              AI analysis
            </h2>

            <span className="language-badge">
              {data.language || "English"}
            </span>

          </div>

          <p className="ai-analysis">
            {data.notice ||
              "The indexed documents contain relevant evidence. Review the cited evidence below; regulatory status and applicability should be confirmed against authoritative sources."}
          </p>

        </div>


        {/* Recommended Standards */}
        <div className="recommendation-section">

          <div className="recommendation-section-header">

            <h2>
              Recommended standards / evidence
            </h2>

          </div>

          {data.recommendations?.length ? (

            <div className="recommendation-list">

              {data.recommendations.map((item, index) => (

                <div
                  className="recommendation-item"
                  key={item.id || index}
                >

                  <h3>
                    {item.standardNumber || item.title || "Recommendation"}
                  </h3>

                  <p>
                    {item.reason ||
                      item.description ||
                      "Relevant evidence identified from the indexed sources."}
                  </p>

                </div>

              ))}

            </div>

          ) : (

            <p className="recommendation-empty">
              No explicit standard recommendation could be safely derived
              from the retrieved evidence.
            </p>

          )}

        </div>


        {/* Evidence */}
        <div className="recommendation-section">

          <div className="recommendation-section-header">

            <h2>
              Evidence
            </h2>

          </div>

          <div className="evidence-list">

            {data.evidence?.map((e, index) => (

              <div
                className="evidence-card"
                key={e.id || index}
              >

                <div className="evidence-card-header">

                  <div>

                    <h3 className="evidence-title">
                      E{index + 1} · {e.title || "Source document"}
                    </h3>

                    <p className="evidence-source">
                      Source: {e.documentName || e.source || "Source document"}
                    </p>

                  </div>
                      <span className="evidence-similarity">
                        Similarity{" "}
                        {Math.round(
                          ((e.similarity ?? e.score ?? e.vectorSimilarity ?? 0) <= 1
                            ? (e.similarity ?? e.score ?? e.vectorSimilarity ?? 0) * 100
                            : (e.similarity ?? e.score ?? e.vectorSimilarity ?? 0))
                        )}%
                      </span>

                </div>

                <p className="evidence-text">
                  {e.text}
                </p>

              </div>

            ))}

          </div>

        </div>


        {/* Gaps */}
        {data.gaps?.length > 0 && (

          <div className="recommendation-section">

            <div className="recommendation-section-header">

              <h2>
                Identified gaps
              </h2>

            </div>

            <div className="recommendation-list">

              {data.gaps.map((gap, index) => (

                <div
                  className="recommendation-item"
                  key={index}
                >
                  <p>
                    {typeof gap === "string"
                      ? gap
                      : gap.description || gap.title || JSON.stringify(gap)}
                  </p>
                </div>

              ))}

            </div>

          </div>

        )}


        {/* Verification Notes */}
        {data.verificationNotes?.length > 0 && (

          <div className="recommendation-section">

            <div className="recommendation-section-header">

              <h2>
                Verification notes
              </h2>

            </div>

            <div>

              {data.verificationNotes.map((note, index) => (

                <div
                  className="verification-note"
                  key={index}
                >
                  {typeof note === "string"
                    ? note
                    : note.description ||
                      note.text ||
                      JSON.stringify(note)}
                </div>

              ))}

            </div>

          </div>

        )}

      </div>

    )}

  </div>
);
}
