-- Add RADICADORA role to enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'RADICADORA';

-- Add registradoPorId column to Plan
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "registradoPorId" TEXT;

-- FK: Plan.registradoPorId -> User.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Plan_registradoPorId_fkey'
  ) THEN
    ALTER TABLE "Plan" ADD CONSTRAINT "Plan_registradoPorId_fkey"
      FOREIGN KEY ("registradoPorId") REFERENCES "User"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Create Notification table
CREATE TABLE IF NOT EXISTS "Notification" (
  "id"        TEXT      NOT NULL,
  "message"   TEXT      NOT NULL,
  "userId"    TEXT      NOT NULL,
  "planoId"   TEXT,
  "isRead"    BOOLEAN   NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- FK: Notification.userId -> User.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Notification_userId_fkey'
  ) THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- FK: Notification.planoId -> Plan.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Notification_planoId_fkey'
  ) THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_planoId_fkey"
      FOREIGN KEY ("planoId") REFERENCES "Plan"("id") ON DELETE SET NULL;
  END IF;
END $$;
