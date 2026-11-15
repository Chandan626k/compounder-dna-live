# CMOTS APIDataFeed and Capitaline — Commercial Data Rights Audit

**Review date:** 2026-11-16  
**Status:** Public-source due diligence only; no vendor enquiry, account, credential, subscription, trial, purchase, agreement or data activation  
**Product context:** StockSamjho is a planned multi-user commercial research application. This audit separates analyst-workbench access from API ingestion, storage/cache, AI/RAG, customer display, derived analytics and redistribution.

## Executive decision

- **CMOTS / APIDataFeed:** A **priority conditional RFQ candidate** for a multi-user website/API data arrangement. Its public terms expressly describe JSON/XML web-services APIs and FTP/CSV delivery, say sourced data is redistributed to clients, and contemplate display on specifically named client websites. This is more relevant to StockSamjho than a personal retail API. However, the public terms are a quotation-dependent template, prices are not published, upstream exchange authority is not verified for every product, and AI/RAG, persistent cache, derived analytics and virtual-paper use are not expressly resolved. Do not integrate or activate it yet.
- **Capitaline:** A potentially strong **human analyst workstation**, but its published standard single-user annual price is ₹2,50,000 plus applicable GST on the registration page. That is far outside the previously considered ₹2,000/month budget. No public developer API or StockSamjho SaaS redistribution licence was found. Do not treat a Capitaline user subscription or exports as a backend feed.
- **NSE real-time authorization:** CMOTS is absent from the 26-name Authorized Realtime Data Vendors PDF currently linked from the NSE page, which displays an update date of 22 October 2026. The PDF itself has no visible issue/effective date, so the parent-page update date must not be misrepresented as the PDF's own publication date. CMOTS's broad statement that it is empanelled with NSE/BSE/MCX/NCDEX must not be interpreted as proof that it is currently an NSE-authorized real-time vendor. Absence from this real-time list does not prove it lacks separate EOD, delayed, corporate-data, or other upstream arrangements; those require product-specific evidence.

Keep `MARKET_DATA_ACCESS_POLICY.status = NOT_CONFIGURED`. No provider adapter, source registry entry, entitlement, ingestion, persistent cache or API credential was created.

## 1. CMOTS / APIDataFeed

### Publicly advertised coverage and delivery

CMOTS describes itself as an Indian capital-market data provider and says it is empanelled with BSE, NSE, MCX and NCDEX. Its APIDataFeed product advertises APIs for equity, derivatives, mutual funds, company announcements, commodities, currency, news, IPOs, other markets and company information, with delayed, historical and end-of-day frequency options.

The official product pages describe:
- An interactive API catalogue and subscription selection process.
- Exchange/group/record-count parameters used to generate API URLs.
- Customized API requests.
- A subscriber account that maintains API and subscription details.
- Web-service delivery in JSON or XML from a CMOTS HTTP server.
- CSV through FTP, pipe-separated.
- UID/password access after provisioning.

The public pages do **not** provide a complete, independently testable StockSamjho API specification: endpoint schemas, field-level provenance, rate limits, historical depth by product, SLA, revision/correction lineage, and all commercial entitlements remain unverified.

### Published terms — useful but not a blanket licence

The official APIDataFeed Terms of Use contains four schedules:

**Schedule I — data sourcing**
- It says data supplied by C-MOTS is acquired from different sources and C-MOTS has the right to redistribute it to its clients.
- The schedule's subscribed data/services and quotation number are placeholders. The exact subscribed products, upstream sources, contract/quotation and legal entity must be completed in the signed documents.

**Schedule II — client use and redistribution**
- The client may use subscribed data only for exhibition on its website, with all platforms and website/product names to be listed.
- The client may not redistribute or resell subscribed data to another data vendor.
- It permits hard-copy printouts of data or parts thereof for distribution to the client's own clients, or inclusion in printed client documents, subject to a specified C-MOTS attribution.
- This is promising for a named StockSamjho website, but it does not by itself settle mobile-app display, downstream API access, user exports, derived metrics, AI-generated explanations, LLM/RAG retrieval, model training, caching/backups or paper/virtual portfolio use.

**Schedule III — delivery**
- Web services are served from a CMOTS HTTP server and may be supplied in JSON or XML.
- FTP delivery is pipe-separated CSV.
- Credentials are to be provided for access; none has been requested or provisioned.

**Schedule IV — commercial terms**
- Annual INR subscription amount is to be filled into the quotation, with applicable taxes extra.
- Subscription and renewal amounts are non-refundable.
- The page says renewal is automatic unless at least one month's prior written notice is given.
- If a project is cancelled or postponed before completion, it states a charge of ₹7,500 per man-day for work completed.
- Additional NSE charges may apply per segment and per platform.

The public template is not a signed StockSamjho entitlement. A completed quotation and negotiated contract must identify each product, upstream source, exchange, display platform, permitted use, storage, derived use and end-user restrictions.

### Provenance and point-in-time gaps

CMOTS's About page says its analysts collate financial and non-financial information from company annual reports, mutual-fund portfolios, stock-exchange price/news feeds, MCX/NCDEX commodity prices, insurance sources and other sources, and digitize the material for database-driven and customized client solutions.

That is a description of collection activity, not a field-level evidence contract. The public material reviewed does not establish, for each returned financial field:
- Original filing/document URL or durable source-record ID.
- Publication/availability timestamp and point-in-time history.
- Financial period start/end, standalone/consolidated basis, currency and units.
- Restatement/correction history and revision lineage.
- A verified exchange/security-to-issuer identity mapping.
- Source-specific commercial entitlement for the exact data product and intended StockSamjho use.

These are mandatory before financial evidence can be treated as validated by StockSamjho's PIT/provenance engine.

### NSE vendor-list cross-check

The NSE page for paid real-time data displays **Updated on: 22/10/2026** and links a one-page **Authorized Realtime Data Vendors** PDF. The linked PDF lists 26 vendors and does not list CMOTS. It lists products/segments such as CM, F&O, CD, debt and index for each named vendor.

**Source-version limitation:** The rendered one-page PDF has no visible issue/effective date. The 22 October 2026 date belongs to the parent NSE web page; it is not evidence that the PDF itself was reissued on that date. The careful conclusion is that CMOTS is absent from the roster currently linked by NSE, not that this file independently proves a date-stamped authorization status as of 22 October. Obtain product-specific written confirmation before relying on this as a contractual or legal determination.

Therefore:
- Do not describe CMOTS as independently verified for NSE real-time equity data.
- Do not infer that its website's general empanelment statement grants NSE real-time redistribution rights.
- Ask CMOTS to identify the exact upstream agreement/authorized vendor and product scope for NSE CM EOD, delayed, historical, corporate data and any real-time product separately.
- The currently linked NSE real-time list does not determine whether CMOTS has separate EOD/delayed, corporate-data or non-NSE exchange arrangements.

### StockSamjho decision

**Conditional RFQ candidate — no approval to integrate.**

Ask for written clarification and a quotation covering:
1. NIFTY 500 issuer/security coverage and complete NSE/BSE symbols, series, ISINs and corporate-action mapping.
2. Equity EOD and historical OHLCV, delayed/snapshot data, corporate announcements, company financials, shareholding and any technical/derived fields — each product separately.
3. Exact upstream source and exchange authorization for each product, including whether CMOTS is the primary source, an authorized vendor or a redistributor.
4. Multi-user commercial SaaS display on the named StockSamjho website and mobile app; number of users, concurrency and platform/site fees.
5. Internal/non-display analytics, derived ratios/scores/rankings, chart indicators and generated explanations.
6. LLM/RAG request-time retrieval, model-provider processing, prompts, retention, training prohibition/permission and audit logs.
7. Persistent storage, cache duration, backups, exports, deletion and post-termination retention.
8. Paper/virtual portfolio price marks and historical simulation use.
9. Field-level source IDs, filing URLs, publication timestamps, reporting periods, currency, units, revisions/restatements and correction lineage.
10. Exact annual and monthly all-in price, setup charges, per-segment/per-platform NSE fees, GST, minimum term, non-refundable terms, auto-renewal, cancellation and support/SLA.

No contact form was submitted and no vendor was contacted in this audit. The contact form asks for corporate identity, application/website name, API categories and intended purpose; that is evidence of a corporate enquiry workflow, not a quote or entitlement.

## 2. Capitaline

### Product capability

Capitaline advertises a broad Indian company and industry research database. Its current Capitaline Enterprise and database product pages describe more than 55,000 listed and unlisted companies, 300+ industries, more than 10 years of financial history, standalone and consolidated financials, P&L, balance sheet, cash flow, segment data, forex/R&D data, ratios, quarterly results, shareholding, finished products/raw materials, share-price data, corporate announcements, news and screener/peer-analysis tools.

This could be valuable for a human research analyst who needs standardized Indian-company financials and sector comparisons. It is not evidence of a callable StockSamjho API or a licence to display, store or redistribute its content.

### Published pricing and package-scope caveat

Capitaline's official database page lists:
- **₹2,50,000 per user per year** for Capitaline.
- **USD 6,250 per user per year** on the same page.

The official registration page lists:
- Capitaline online version: ₹2,50,000 + GST per year.
- A special IAIP-member single-user offer: ₹30,000 + GST per year.
- Capitaline + NAV India combined: ₹4,00,000 + GST per year; special IAIP-member offer ₹50,000 + GST.

The IAIP discount is eligibility-specific and must not be treated as a generally available price. The standard ₹2,50,000 + GST single-user price is approximately ₹20,833 per month before GST, more than ten times the ₹2,000/month target. The combined product is more expensive.

**Coverage/package reconciliation:** The current `/Demo/Plus.aspx` page advertises 55,000+ companies and the ₹2,50,000 annual per-user price. The older `/CFA/RegisterUser.aspx` registration page still describes 35,000 companies and 313 industries while showing the same standard price and IAIP offer. The current landing page also distinguishes Capitaline Enterprise from other product modules. These public pages do not clearly map the 55,000+ Enterprise coverage to every registration-page package or entitlement. Treat 55,000+ as an advertised Enterprise/database figure, not a guaranteed count for the exact product to be quoted; request the package name, coverage universe and included modules in writing.

No public developer API specification, machine-readable commercial licence, multi-user SaaS display rights, AI/RAG permission, storage/cache rights or paper-trading permission was located in the reviewed public pages.

### StockSamjho decision

**Not a budget-fit backend candidate on published standard pricing.** It may be considered as a separately licensed human analyst workstation only if the user explicitly wants that cost and its account terms permit the intended analyst use. Do not use a personal subscription, manual export or browser session as a shared StockSamjho backend.

## 3. Permission and evidence matrix

| Requirement | CMOTS / APIDataFeed | Capitaline |
|---|---|---|
| Public API offering | Yes; JSON/XML web services and FTP/CSV described | No public developer API found |
| Delayed / historical / EOD | Advertised product categories | Market/history features advertised in workstation |
| Multi-user commercial website display | Template contemplates named client website; exact contract needed | Not established |
| Raw redistribution to another vendor | Restricted | Not established / no backend licence found |
| Derived analytics and rankings | Not expressly resolved | Not established |
| AI/RAG / LLM processing | Not expressly resolved | Not established |
| Persistent cache / backups | Not expressly resolved | Not established |
| Paper/virtual portfolio marks | Not expressly resolved | Not established |
| Field-level PIT provenance | Not established | Not established by public product page |
| Public price | Not found | ₹2,50,000 + GST per user/year standard |
| Fit with ₹2,000/month target | Unknown until quotation | No, on standard published price |

## 4. Overall provider decision

1. **CMOTS / APIDataFeed — first conditional RFQ candidate in this audit.** It has a real API/FTP product and a published contract template that contemplates named client website display. It is not approved until upstream rights, data scope, provenance, downstream AI/derived-use permissions and price are documented.
2. **Capitaline — analyst workstation only, not budget-fit.** Strong advertised coverage, but standard single-user pricing is too high and no public API/redistribution entitlement was located.
3. **NSE direct commercial feed — not a ₹2,000/month assumption.** NSE's current data policy requires a relevant agreement for commercial use and says redistribution is only as agreed. Product-specific tariffs and permitted use must be evaluated separately.

## 5. Engineering guardrails

- Keep `MARKET_DATA_ACCESS_POLICY.status = NOT_CONFIGURED`.
- Do not add a CMOTS or Capitaline provider adapter, ingestion, database/cache, entitlement registry entry, credentials or API route from this public audit.
- Do not scrape APIDataFeed or Capitaline, automate browser access, reuse cookies or infer undocumented endpoints.
- Do not infer current NSE real-time authorization from a general vendor claim.
- Keep issuer identity, original source, publication time, period, currency, units, revision and PIT as `UNKNOWN`, `PIT_UNKNOWN` or `UNAVAILABLE` until independently validated.
- No account, vendor contact, quotation request, trial, subscription, purchase, agreement or data activation was initiated.

## 6. Public sources reviewed on 16 November 2026

1. CMOTS — API DataFeed product: https://www.cmots.com/products/api-datafeed
2. CMOTS — Market-data provider and empanelment claim: https://www.cmots.com/
3. APIDataFeed — About and data collection description: https://www.apidatafeed.com/about-us
4. APIDataFeed — Terms of Use, Schedules I–IV: https://www.apidatafeed.com/terms-of-use
5. APIDataFeed — Corporate contact form: https://www.apidatafeed.com/contact-us
6. NSE — Paid Real Time Data, page updated 22 October 2026: https://www.nseindia.in/static/market-data/real-time-data-subscription
7. NSE Data & Analytics — Authorized Realtime Data Vendors PDF linked from the above page (no visible issue/effective date in the PDF): https://nsearchives.nseindia.com/web/sites/default/files/inline-files/Authorized_Realtime_Data_Vendors.pdf
8. NSE Data Sharing & Usage Policy: https://betanseapi.nseindia.com/static/market-data/nse-data-policy
9. Capitaline — official product website and Enterprise coverage: https://www.capitaline.com/
10. Capitaline — database features and standard subscription price: https://www.capitaline.com/Demo/Plus.aspx
11. Capitaline — registration page, older coverage description and single-user annual prices / IAIP special offer: https://www.capitaline.com/CFA/RegisterUser.aspx

**Bottom line:** CMOTS is worth a written, product-specific commercial quotation request before any integration decision. Capitaline is a strong research workstation but not a low-cost backend. The NSE vendor roster and Capitaline coverage/package scope both have source-version caveats that must be resolved in writing. No provider is approved or activated by this audit.
