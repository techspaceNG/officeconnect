-- AlterTable
ALTER TABLE "File" ADD COLUMN     "sharedWithId" INTEGER;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_sharedWithId_fkey" FOREIGN KEY ("sharedWithId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
