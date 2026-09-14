# Refrigerator Tender Validation Demo

## 1. Seed the verified registry metadata
From the project root:

```bash
node scripts/seed-refrigerator-demo-standards.js
```

This creates/updates four Standard Registry records using BIS-published metadata. It does not contain copyrighted standard text.

## 2. Upload the tender
Upload `Lab_Refrigerator_Tender_Validation_Test.pdf` in Documents and choose `Tender`.

Wait for `processed` and `embeddings: completed`.

## 3. Validate
Open Tender Validation, select the tender, and validate.

Expected: explicit-reference matches for the four referenced standards, with other procurement requirements potentially remaining missing/review.

## 4. Important
The test tender is synthetic. It is not an official government tender. Applicability of standards to a real procurement must be independently verified.
