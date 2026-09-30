-- O nome como a busca de assinantes o compara: sem os acentos do português e em minúsculas. É a
-- regra de nomeDeBusca (packages/db/src/busca.ts), que a API aplica ao termo. O unaccent não está
-- garantido no banco: os acentos saem por translate().
CREATE FUNCTION "nome_de_busca"(texto TEXT) RETURNS TEXT
LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE
AS $$
  SELECT lower(translate(
    normalize(texto, NFC),
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ',
    'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn'
  ))
$$;

-- AlterTable
ALTER TABLE "assinante" ADD COLUMN     "nomeBusca" TEXT NOT NULL DEFAULT '';

-- Preenche as linhas que já existem.
UPDATE "assinante" SET "nomeBusca" = "nome_de_busca"("nome");

-- Mantém a coluna em todo INSERT e UPDATE, venha a escrita de onde vier (API, seed, Prisma Studio).
CREATE FUNCTION "assinante_nome_busca"() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."nomeBusca" := "nome_de_busca"(NEW."nome");
  RETURN NEW;
END
$$;

CREATE TRIGGER "assinante_nome_busca"
BEFORE INSERT OR UPDATE ON "assinante"
FOR EACH ROW EXECUTE FUNCTION "assinante_nome_busca"();

-- CreateIndex
CREATE INDEX "assinante_nomeBusca_idx" ON "assinante"("nomeBusca");
