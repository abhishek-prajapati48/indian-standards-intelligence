# Refrigerator Tender Validation Demo

This demo uses BIS-published metadata for four standards relevant to refrigerating appliances. It does **not** reproduce the copyrighted text of any Indian Standard.

## Standards to seed

- IS 17550 : Part 1 (2024) — Household Refrigerating Appliances — Part 1 General Requirements
- IS 17550 : Part 2 (2024) — Household Refrigerating Appliances — Part 2 Performance Requirements
- IS 17550 : Part 3 (2025) — Household Refrigerating Appliances — Part 3 Energy Consumption and Volume
- IS 18689 (2024) — Safety — Particular Requirements for Commercial Refrigerating Appliances and Ice-Makers

Run:

```bash
node scripts/seed-refrigerator-demo-standards.js
```

Then process the tender PDF `Lab_Refrigerator_Tender_Validation_Test.pdf` as **Tender**.

The tender explicitly references these four standards. The validator should produce explicit-reference matches for those requirements. Quantity, installation, warranty, and similar procurement obligations may remain missing because they are not themselves necessarily standard references.

## Authoritative sources

- https://www.bis.gov.in/wp-content/uploads/2025/02/PM-17550-1-fEB-2025.pdf
- https://lims.bis.gov.in/home/search_is_number/?is_number__doc_no=17550&page=1
- https://lims.bis.gov.in/home_lab_scope/74/

This is a software demonstration dataset. Applicability to a real procurement must be independently confirmed against current BIS material and the actual product scope.
