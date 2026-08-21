-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'DONE', 'CANCELED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "petshops" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petshops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "petshop_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dogs" (
    "id" TEXT NOT NULL,
    "petshop_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "breed" TEXT,
    "tutor_name" TEXT NOT NULL,
    "tutor_phone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "petshop_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_price" DECIMAL(10,2) NOT NULL,
    "default_duration_min" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "petshop_id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "taxidog_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "contact_phone" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "whatsapp_reminder_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "petshop_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Confirmação padrão',
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "petshops_slug_key" ON "petshops"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_petshop_id_idx" ON "users"("petshop_id");

-- CreateIndex
CREATE INDEX "dogs_petshop_id_idx" ON "dogs"("petshop_id");

-- CreateIndex
CREATE INDEX "services_petshop_id_idx" ON "services"("petshop_id");

-- CreateIndex
CREATE INDEX "appointments_petshop_id_scheduled_at_idx" ON "appointments"("petshop_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "message_templates_petshop_id_idx" ON "message_templates"("petshop_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_petshop_id_fkey" FOREIGN KEY ("petshop_id") REFERENCES "petshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dogs" ADD CONSTRAINT "dogs_petshop_id_fkey" FOREIGN KEY ("petshop_id") REFERENCES "petshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_petshop_id_fkey" FOREIGN KEY ("petshop_id") REFERENCES "petshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_petshop_id_fkey" FOREIGN KEY ("petshop_id") REFERENCES "petshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "dogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_petshop_id_fkey" FOREIGN KEY ("petshop_id") REFERENCES "petshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
