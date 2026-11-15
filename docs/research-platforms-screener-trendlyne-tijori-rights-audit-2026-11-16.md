# Indian Equity Research Platforms: Screener, Trendlyne and Tijori Use-Rights Audit

**Review date:** 2026-11-16  
**Status:** Public-source due diligence only; no platform account, subscription, connector, API, export job or data entitlement was activated  
**Product context:** StockSamjho is a planned multi-user research product. This audit separates human analyst research access from data ingestion, storage, AI/RAG, customer display and redistribution.

## Executive decision

- **Screener.in:** Strong manual fundamental-screening and analyst-workbench utility. Its official support page explicitly says Screener does not provide APIs; premium users can manually export screen results to CSV. Its published terms (last updated 1 Aug 2018) grant personal, non-commercial viewing and prohibit commercial use, copying, public display and mirroring. Do not scrape it, call undocumented endpoints, automate page access, or ingest its exports into StockSamjho without separate written permission and clarified rights.
- **Trendlyne:** Its official MCP server support article (updated 21 Jul 2026) documents entity search, financial statements/ratios, technical indicators, shareholding/pledge/deal disclosures and document search. This is a meaningful analyst-tool capability, but the published website terms restrict redistribution, machine-readable databases, storage, public display and onward access unless separately and specifically authorized in writing. An MCP server is not itself a StockSamjho commercial data licence.
- **Tijori Finance:** Its current public terms reserve intellectual-property rights and prohibit copying, storing, distributing, displaying, creating derivative works or other exploitation beyond personal, non-commercial use without prior written permission. Its website advertises deep financial/operating metrics and source links, but no public developer API or StockSamjho commercial data licence was located in the materials reviewed.

**Overall:** These platforms can be useful as human-operated research workbenches under their own account and terms. None is approved as a StockSamjho backend source, shared data feed, AI/RAG corpus, customer-facing display source, paper-portfolio mark source or redistribution source on the evidence reviewed. Keep `MARKET_DATA_ACCESS_POLICY.status = NOT_CONFIGURED`.

## 1. Screener.in

### Verified product capabilities

Screener describes listed-company financial data, 10–15 years of historical financials, screening queries, regulatory filing/announcement tracking, segment results and Excel export on its feature page.

Its official support article, **“Exporting Screen results in Screener”**, states:
- Screener does not provide APIs.
- Screen results can be downloaded manually as CSV using the Export option.
- Export is a Premium feature.
- The CSV contains NSE and BSE exchange codes and an industry column, which can help a human analyst collate research from other sources.
- The support article was last updated 22 May 2021.

The CSV export feature is therefore not evidence of a documented, supported, continuously callable production API. Do not treat browser network requests, private endpoints, third-party wrappers or community MCP/scraper projects as official interfaces.

### Published terms

The official Screener Terms of Service page states **“Last updated Aug 01, 2018”**. The published licence is for personal, non-commercial transitory viewing only and prohibits copying/modifying materials, commercial use, public display and transferring or mirroring materials on another server. The page also says the site data is automatically sourced/curated, may contain errors, and is not warranted to be accurate, complete or current.

Because the displayed terms date is old, obtain written clarification from Screener before relying on any later product or enterprise permission. Do not infer that Premium CSV export overrides the published licence or grants StockSamjho storage, AI, display or redistribution rights.

### StockSamjho decision

- **Human analyst use:** Potentially suitable for manual idea generation and cross-checking within the permitted personal/non-commercial account use. The analyst must still verify material figures against company filings.
- **Automated API / scraping:** Not approved; no official public API is documented.
- **CSV ingestion into StockSamjho:** Not approved without written permission and a licence covering commercial storage, derived use, AI/RAG and customer display.
- **Customer display / redistribution / paper marks:** Not approved.
- **Point-in-time evidence:** A current screen export alone does not establish historical constituent membership, source publication time, restatement lineage or a leakage-free point-in-time record.

## 2. Trendlyne

### Verified analyst-tool capability

Trendlyne's official support article **“What capabilities are currently available in the Trendlyne MCP Server”**, modified 21 July 2026, lists:
1. Entity search resolving stocks, ETFs, indices, sectors and themes to NSE symbols, BSE codes or ISINs.
2. Overview, news, corporate events and technical indicators including RSI, MFI, MACD and moving averages.
3. Multi-stock parameter retrieval covering P&L, balance sheet, cash flow, ratios, analyst estimates, insider trades, price/volume and technical indicators.
4. Ownership, promoter/FII/DII/MF shareholding, SAST, pledges, and bulk/block deals.
5. Semantic search across annual reports, quarterly results, earnings-call transcripts and investor presentations.

This is a documented official MCP capability and can be useful for analyst research. It does not, by itself, grant a third-party application the right to persist or redistribute retrieved information.

### Published terms and upstream price-feed note

Trendlyne's published Terms and Conditions grant a limited, non-exclusive, non-assignable and non-transferable access licence. The copyright/no-retransmission section says information may not be resold, redistributed, broadcast, transferred or used in a searchable machine-readable database without separate, specific prior written authorization. It also restricts copying, public display, publishing, adapting, storing or time-sharing information to or through another person/entity absent such written authorization.

The same terms state that the stock-price feed is provided by C-MOTS Internet Technologies Pvt Ltd and is delayed. That statement is not a licence for StockSamjho to redistribute the underlying feed.

### StockSamjho decision

- **Human analyst research via Trendlyne's official interface/MCP:** A possible analyst-workbench route, subject to the user's own valid access and applicable plan terms. Do not share credentials or reuse a personal session as a backend service.
- **Machine-readable storage, AI/RAG corpus, customer display or redistribution:** Not approved without separate written Trendlyne authorization that expressly covers each use.
- **Provider data lineage:** The MCP capability list does not itself establish field-level original filing IDs, publication timestamps, period dates, correction/revision history, or exchange redistribution entitlement. Those must be verified independently before a value can pass StockSamjho's evidence gate.
- **Third-party price feed:** Delayed-feed disclosure is not sufficient for real-time, paper-trading, public-display or redistribution rights.

## 3. Tijori Finance

### Verified product capabilities

The public Tijori website describes company/sector research, a stock screener, operational metrics, historical market-share/revenue-mix and sector information, and source links. The terms page advertises Premium features including in-depth financial comparison, reverse DCF and historical operational metrics.

### Published terms

The official Terms of Use say users must not copy, reproduce, recompile, distribute, publish, display, modify, create derivative works from, transmit or otherwise exploit the service. The intellectual-property section says any use of the website or contents—including copying or storing in whole or part—other than personal, non-commercial use is prohibited without prior written permission. It also says website access does not confer a licence to the company's or third parties' IP.

No public developer API specification, commercial data-feed agreement or StockSamjho-specific downstream rights schedule was located in the public materials reviewed. This is an evidence gap, not proof that Tijori could never offer a separately negotiated enterprise arrangement.

### StockSamjho decision

- **Human analyst research:** Potentially useful within personal/non-commercial account terms; verify all investment-critical figures against primary company/exchange documents.
- **Automated ingestion, persistent storage, AI/RAG, customer display or redistribution:** Not approved without written permission and a product-specific commercial agreement.
- **Source links:** Helpful for manual verification, but their presence does not automatically grant bulk download, storage or redistribution rights.

## 4. Cross-platform permission matrix

| Intended use | Screener.in | Trendlyne | Tijori |
|---|---|---|---|
| Human analyst viewing under own permitted account | Conditional | Conditional | Conditional |
| Manual idea generation / screening | Conditional | Conditional | Conditional |
| Official public developer API | No API documented | Official MCP documented; commercial downstream rights unknown | No public developer API located |
| Automated scraping / undocumented endpoints | Not approved | Not approved | Not approved |
| Persistent StockSamjho storage/cache | Not approved | Written permission required | Written permission required |
| AI/RAG retrieval and generated explanations | Written permission required | Written permission required | Written permission required |
| Multi-user website/mobile display | Written permission required | Written permission required | Written permission required |
| Raw or derived redistribution | Written permission required | Written permission required | Written permission required |
| Paper/virtual portfolio price marks | Not approved | Not approved | Not approved |
| PIT-grade filing provenance and correction lineage | Not established by export alone | Must be independently verified | Must be independently verified |

“Conditional” means the human analyst must use their own authorized account and remain within the provider's applicable plan and terms. It does not mean StockSamjho has any data entitlement.

## 5. Required written clarification before any commercial use

For any platform willing to discuss an enterprise arrangement, obtain written answers covering:
1. Contracting legal entity, product/API name and version, and authorized signatory.
2. Whether the data may be used in a multi-user commercial investment research application.
3. Internal/non-display analytics, indicators, derived metrics, ranking/screener outputs and generated explanations.
4. LLM/RAG retrieval, third-party model-provider processing, model grounding/training, prompts and retention.
5. Persistent storage, cache duration, backups, exports, audit logs and deletion obligations.
6. Customer-facing web/mobile display, user/concurrency limits, customer reports and APIs.
7. Raw/derived redistribution, sublicensing, public display and paper/virtual portfolio use.
8. Original exchange/company source references, publication timestamps, period dates, standalone/consolidated basis, units, currency, revisions/restatements and correction lineage.
9. Exact coverage, history depth, refresh frequency, service levels, rate limits and all-in price including setup, minimum commitment, taxes and any upstream exchange charges.

A verbal assurance, product demo, account subscription, API key or MCP connection is not a substitute for the signed rights schedule.

## 6. Engineering and research guardrails

- Do not add a Screener, Trendlyne or Tijori scraper, private endpoint, browser-cookie integration, account-sharing flow or unofficial API wrapper.
- Do not add a provider adapter, ingestion pipeline, database/cache, entitlement record or source-authority factory from this audit.
- Do not treat CSV export or MCP output as a primary exchange/company filing.
- Keep missing issuer identity, source scope, entitlement, publication time, period, currency, units, revision lineage and point-in-time status as `UNKNOWN`, `PIT_UNKNOWN` or `UNAVAILABLE`.
- Verify all material financial facts against original company filings and exchange announcements before they can enter a validated evidence record.
- Preserve the existing fail-closed market-data gate and all frozen research/holdout boundaries.
- No account, credential, connector, trial, subscription, purchase, vendor enquiry, agreement or data activation was initiated in this audit.

## 7. Public sources reviewed on 16 November 2026

1. Screener — official support, “Exporting Screen results in Screener” (last updated 22 May 2021): https://support.screener.in/article/28-export-screen-results
2. Screener — official Terms of Service (page states last updated 1 August 2018): https://www.screener.in/guides/terms/
3. Screener — official features: https://www.screener.in/features/
4. Trendlyne — official MCP Server capabilities (modified 21 July 2026): https://help.trendlyne.com/support/solutions/articles/84000399411-what-capabilities-are-currently-available-in-the-trendlyne-mcp-server-
5. Trendlyne — official Terms and Conditions, especially licence and copyright/no-retransmission clauses: https://trendlyne.com/terms/
6. Tijori Finance — official Terms of Use: https://android.tijorifinance.com/terms-of-use

**Bottom line:** Use these services as analyst workbenches only within their own terms. Do not turn a personal research subscription, CSV export or MCP tool into a StockSamjho commercial data feed without explicit written rights. Keep the product's market-data gate closed until source identity, provenance, point-in-time quality, entitlement and every downstream use are independently established.
