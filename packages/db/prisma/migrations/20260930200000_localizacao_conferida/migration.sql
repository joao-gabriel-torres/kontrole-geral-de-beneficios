-- AlterTable
ALTER TABLE "acionamento" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "assinante" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- A posição conferida no mapa é gravada inteira: latitude e longitude juntas, ou nenhuma das duas.
-- O schema do Prisma não descreve CHECK, mas as próximas migrações também não as removem.
ALTER TABLE "acionamento" ADD CONSTRAINT "acionamento_localizacao_completa"
  CHECK (("latitude" IS NULL) = ("longitude" IS NULL));

ALTER TABLE "assinante" ADD CONSTRAINT "assinante_localizacao_completa"
  CHECK (("latitude" IS NULL) = ("longitude" IS NULL));
