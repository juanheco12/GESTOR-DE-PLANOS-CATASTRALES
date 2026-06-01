-- Remove firma (digital signature) column from Request table
ALTER TABLE "Request" DROP COLUMN IF EXISTS "firma";
