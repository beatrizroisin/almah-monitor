/*
  Warnings:

  - You are about to drop the column `dev_owner_id` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `media_owner_id` on the `clients` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "clients" DROP CONSTRAINT "clients_dev_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "clients" DROP CONSTRAINT "clients_media_owner_id_fkey";

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "dev_owner_id",
DROP COLUMN "media_owner_id",
ADD COLUMN     "dev_owner_name" TEXT,
ADD COLUMN     "media_owner_name" TEXT;
