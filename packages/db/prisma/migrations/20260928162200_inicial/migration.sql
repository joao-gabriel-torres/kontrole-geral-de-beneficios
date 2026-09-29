-- CreateEnum
CREATE TYPE "StatusPrestador" AS ENUM ('ativo', 'inativo');

-- CreateEnum
CREATE TYPE "StatusAcionamento" AS ENUM ('aberto', 'em_andamento', 'aguardando', 'reprovado', 'aprovado');

-- CreateEnum
CREATE TYPE "ContextoFoto" AS ENUM ('etapa', 'conclusao', 'inviabilidade');

-- CreateEnum
CREATE TYPE "Decisao" AS ENUM ('aprovado', 'reprovado');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('criado', 'iniciado', 'enviado', 'inviabilidade_enviada', 'aprovado', 'reprovado');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'prestador',
    "prestadorId" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_demanda" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "checklist" TEXT[],
    "excluidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipo_demanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestador" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "regiao" TEXT,
    "status" "StatusPrestador" NOT NULL DEFAULT 'ativo',
    "credenciadoDesde" DATE NOT NULL,
    "excluidoEm" TIMESTAMP(3),
    "cor" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prestador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acionamento" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "inicio" TEXT NOT NULL,
    "fim" TEXT NOT NULL,
    "prestadorId" TEXT NOT NULL,
    "status" "StatusAcionamento" NOT NULL DEFAULT 'aberto',
    "inviavel" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iniciadoEm" TIMESTAMP(3),
    "comentarioConclusao" TEXT,
    "inviabilidadeComentario" TEXT,
    "criadoPorId" TEXT NOT NULL,

    CONSTRAINT "acionamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demanda" (
    "id" TEXT NOT NULL,
    "acionamentoId" TEXT NOT NULL,
    "tipoId" TEXT NOT NULL,
    "tipoNome" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "demanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapa" (
    "id" TEXT NOT NULL,
    "demandaId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "feita" BOOLEAN NOT NULL DEFAULT false,
    "comentario" TEXT,

    CONSTRAINT "etapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foto" (
    "id" TEXT NOT NULL,
    "acionamentoId" TEXT NOT NULL,
    "contexto" "ContextoFoto" NOT NULL,
    "etapaId" TEXT,
    "storageKey" TEXT NOT NULL,
    "tiradaEm" TIMESTAMP(3) NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "foto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revisao" (
    "id" TEXT NOT NULL,
    "acionamentoId" TEXT NOT NULL,
    "decisao" "Decisao" NOT NULL,
    "motivo" TEXT,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gestorId" TEXT NOT NULL,

    CONSTRAINT "revisao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento_acionamento" (
    "id" TEXT NOT NULL,
    "acionamentoId" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" TEXT NOT NULL,
    "dados" JSONB,

    CONSTRAINT "evento_acionamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracao" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "photoMin" INTEGER NOT NULL DEFAULT 1,
    "requireAllSteps" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "configuracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_Especialidades" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_Especialidades_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_prestadorId_key" ON "user"("prestadorId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_demanda_nome_key" ON "tipo_demanda"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "prestador_documento_key" ON "prestador"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "acionamento_numero_key" ON "acionamento"("numero");

-- CreateIndex
CREATE INDEX "acionamento_prestadorId_data_idx" ON "acionamento"("prestadorId", "data");

-- CreateIndex
CREATE INDEX "acionamento_status_idx" ON "acionamento"("status");

-- CreateIndex
CREATE INDEX "demanda_acionamentoId_idx" ON "demanda"("acionamentoId");

-- CreateIndex
CREATE INDEX "etapa_demandaId_idx" ON "etapa"("demandaId");

-- CreateIndex
CREATE INDEX "foto_acionamentoId_idx" ON "foto"("acionamentoId");

-- CreateIndex
CREATE INDEX "revisao_acionamentoId_idx" ON "revisao"("acionamentoId");

-- CreateIndex
CREATE INDEX "evento_acionamento_acionamentoId_em_idx" ON "evento_acionamento"("acionamentoId", "em");

-- CreateIndex
CREATE INDEX "_Especialidades_B_index" ON "_Especialidades"("B");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_prestadorId_fkey" FOREIGN KEY ("prestadorId") REFERENCES "prestador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acionamento" ADD CONSTRAINT "acionamento_prestadorId_fkey" FOREIGN KEY ("prestadorId") REFERENCES "prestador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acionamento" ADD CONSTRAINT "acionamento_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demanda" ADD CONSTRAINT "demanda_acionamentoId_fkey" FOREIGN KEY ("acionamentoId") REFERENCES "acionamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demanda" ADD CONSTRAINT "demanda_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "tipo_demanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapa" ADD CONSTRAINT "etapa_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "demanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foto" ADD CONSTRAINT "foto_acionamentoId_fkey" FOREIGN KEY ("acionamentoId") REFERENCES "acionamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foto" ADD CONSTRAINT "foto_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "etapa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisao" ADD CONSTRAINT "revisao_acionamentoId_fkey" FOREIGN KEY ("acionamentoId") REFERENCES "acionamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisao" ADD CONSTRAINT "revisao_gestorId_fkey" FOREIGN KEY ("gestorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_acionamento" ADD CONSTRAINT "evento_acionamento_acionamentoId_fkey" FOREIGN KEY ("acionamentoId") REFERENCES "acionamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_acionamento" ADD CONSTRAINT "evento_acionamento_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Especialidades" ADD CONSTRAINT "_Especialidades_A_fkey" FOREIGN KEY ("A") REFERENCES "prestador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Especialidades" ADD CONSTRAINT "_Especialidades_B_fkey" FOREIGN KEY ("B") REFERENCES "tipo_demanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
