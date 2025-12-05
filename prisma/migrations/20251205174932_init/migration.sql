-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin_global', 'empresa_admin', 'empleado');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('scheduled', 'in_progress', 'finished', 'cancelled');

-- CreateEnum
CREATE TYPE "ParticipationMode" AS ENUM ('general', 'by_area', 'both');

-- CreateEnum
CREATE TYPE "AreaRankingCalculation" AS ENUM ('average', 'sum');

-- CreateEnum
CREATE TYPE "RankingType" AS ENUM ('individual_general', 'individual_by_area', 'area');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "sport_type" TEXT NOT NULL DEFAULT 'futbol',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "flag_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "team_a_id" TEXT NOT NULL,
    "team_b_id" TEXT NOT NULL,
    "match_date" TIMESTAMP(3) NOT NULL,
    "stage" TEXT,
    "location" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'scheduled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_results" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "goals_team_a" INTEGER NOT NULL DEFAULT 0,
    "goals_team_b" INTEGER NOT NULL DEFAULT 0,
    "yellow_cards_team_a" INTEGER NOT NULL DEFAULT 0,
    "yellow_cards_team_b" INTEGER NOT NULL DEFAULT 0,
    "red_cards_team_a" INTEGER NOT NULL DEFAULT 0,
    "red_cards_team_b" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "finalized_at" TIMESTAMP(3),

    CONSTRAINT "match_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_scorers" (
    "id" TEXT NOT NULL,
    "match_result_id" TEXT NOT NULL,
    "player_full_name" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "goals_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_scorers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_variables" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "variable_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prediction_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "corporate_domain" TEXT,
    "require_corporate_email" BOOLEAN NOT NULL DEFAULT false,
    "logo_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#1976d2',
    "secondary_color" TEXT NOT NULL DEFAULT '#424242',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "admin_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_areas" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "company_area_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prodes" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "participation_mode" "ParticipationMode" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prode_variable_configs" (
    "id" TEXT NOT NULL,
    "prode_id" TEXT NOT NULL,
    "prediction_variable_id" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "prode_variable_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prode_ranking_configs" (
    "id" TEXT NOT NULL,
    "prode_id" TEXT NOT NULL,
    "show_individual_general" BOOLEAN NOT NULL DEFAULT true,
    "show_individual_by_area" BOOLEAN NOT NULL DEFAULT false,
    "show_area_ranking" BOOLEAN NOT NULL DEFAULT false,
    "area_ranking_calculation" "AreaRankingCalculation" NOT NULL DEFAULT 'average',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prode_ranking_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prode_participants" (
    "id" TEXT NOT NULL,
    "prode_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prode_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL,
    "prode_participant_id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "predicted_goals_team_a" INTEGER,
    "predicted_goals_team_b" INTEGER,
    "predicted_yellow_cards_team_a" INTEGER,
    "predicted_yellow_cards_team_b" INTEGER,
    "predicted_red_cards_team_a" INTEGER,
    "predicted_red_cards_team_b" INTEGER,
    "locked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predicted_scorers" (
    "id" TEXT NOT NULL,
    "prediction_id" TEXT NOT NULL,
    "player_full_name" TEXT NOT NULL,
    "predicted_goals" INTEGER NOT NULL,
    "team_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predicted_scorers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_scores" (
    "id" TEXT NOT NULL,
    "prediction_id" TEXT NOT NULL,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranking_cache" (
    "id" TEXT NOT NULL,
    "prode_id" TEXT NOT NULL,
    "ranking_type" "RankingType" NOT NULL,
    "company_area_id" TEXT,
    "ranked_data" JSONB NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranking_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "competitions_slug_key" ON "competitions"("slug");

-- CreateIndex
CREATE INDEX "competitions_slug_idx" ON "competitions"("slug");

-- CreateIndex
CREATE INDEX "competitions_is_active_idx" ON "competitions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "teams_code_key" ON "teams"("code");

-- CreateIndex
CREATE INDEX "teams_code_idx" ON "teams"("code");

-- CreateIndex
CREATE INDEX "matches_competition_id_match_date_idx" ON "matches"("competition_id", "match_date");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE INDEX "matches_match_date_idx" ON "matches"("match_date");

-- CreateIndex
CREATE UNIQUE INDEX "match_results_match_id_key" ON "match_results"("match_id");

-- CreateIndex
CREATE INDEX "match_scorers_match_result_id_idx" ON "match_scorers"("match_result_id");

-- CreateIndex
CREATE INDEX "match_scorers_player_full_name_idx" ON "match_scorers"("player_full_name");

-- CreateIndex
CREATE UNIQUE INDEX "prediction_variables_code_key" ON "prediction_variables"("code");

-- CreateIndex
CREATE INDEX "prediction_variables_code_idx" ON "prediction_variables"("code");

-- CreateIndex
CREATE INDEX "prediction_variables_is_active_idx" ON "prediction_variables"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_slug_idx" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_is_active_idx" ON "companies"("is_active");

-- CreateIndex
CREATE INDEX "company_areas_company_id_idx" ON "company_areas"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_areas_company_id_name_key" ON "company_areas"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees"("user_id");

-- CreateIndex
CREATE INDEX "employees_company_id_idx" ON "employees"("company_id");

-- CreateIndex
CREATE INDEX "employees_company_area_id_idx" ON "employees"("company_area_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_company_id_key" ON "employees"("user_id", "company_id");

-- CreateIndex
CREATE INDEX "prodes_company_id_idx" ON "prodes"("company_id");

-- CreateIndex
CREATE INDEX "prodes_competition_id_idx" ON "prodes"("competition_id");

-- CreateIndex
CREATE INDEX "prodes_is_active_idx" ON "prodes"("is_active");

-- CreateIndex
CREATE INDEX "prode_variable_configs_prode_id_idx" ON "prode_variable_configs"("prode_id");

-- CreateIndex
CREATE UNIQUE INDEX "prode_variable_configs_prode_id_prediction_variable_id_key" ON "prode_variable_configs"("prode_id", "prediction_variable_id");

-- CreateIndex
CREATE UNIQUE INDEX "prode_ranking_configs_prode_id_key" ON "prode_ranking_configs"("prode_id");

-- CreateIndex
CREATE INDEX "prode_participants_prode_id_idx" ON "prode_participants"("prode_id");

-- CreateIndex
CREATE INDEX "prode_participants_employee_id_idx" ON "prode_participants"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "prode_participants_prode_id_employee_id_key" ON "prode_participants"("prode_id", "employee_id");

-- CreateIndex
CREATE INDEX "predictions_prode_participant_id_idx" ON "predictions"("prode_participant_id");

-- CreateIndex
CREATE INDEX "predictions_match_id_idx" ON "predictions"("match_id");

-- CreateIndex
CREATE INDEX "predictions_locked_at_idx" ON "predictions"("locked_at");

-- CreateIndex
CREATE UNIQUE INDEX "predictions_prode_participant_id_match_id_key" ON "predictions"("prode_participant_id", "match_id");

-- CreateIndex
CREATE INDEX "predicted_scorers_prediction_id_idx" ON "predicted_scorers"("prediction_id");

-- CreateIndex
CREATE INDEX "predicted_scorers_player_full_name_idx" ON "predicted_scorers"("player_full_name");

-- CreateIndex
CREATE UNIQUE INDEX "prediction_scores_prediction_id_key" ON "prediction_scores"("prediction_id");

-- CreateIndex
CREATE INDEX "prediction_scores_prediction_id_idx" ON "prediction_scores"("prediction_id");

-- CreateIndex
CREATE INDEX "ranking_cache_prode_id_idx" ON "ranking_cache"("prode_id");

-- CreateIndex
CREATE UNIQUE INDEX "ranking_cache_prode_id_ranking_type_company_area_id_key" ON "ranking_cache"("prode_id", "ranking_type", "company_area_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_idx" ON "audit_logs"("company_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_a_id_fkey" FOREIGN KEY ("team_a_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_b_id_fkey" FOREIGN KEY ("team_b_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_scorers" ADD CONSTRAINT "match_scorers_match_result_id_fkey" FOREIGN KEY ("match_result_id") REFERENCES "match_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_scorers" ADD CONSTRAINT "match_scorers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_areas" ADD CONSTRAINT "company_areas_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_area_id_fkey" FOREIGN KEY ("company_area_id") REFERENCES "company_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prodes" ADD CONSTRAINT "prodes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prodes" ADD CONSTRAINT "prodes_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prode_variable_configs" ADD CONSTRAINT "prode_variable_configs_prode_id_fkey" FOREIGN KEY ("prode_id") REFERENCES "prodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prode_variable_configs" ADD CONSTRAINT "prode_variable_configs_prediction_variable_id_fkey" FOREIGN KEY ("prediction_variable_id") REFERENCES "prediction_variables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prode_ranking_configs" ADD CONSTRAINT "prode_ranking_configs_prode_id_fkey" FOREIGN KEY ("prode_id") REFERENCES "prodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prode_participants" ADD CONSTRAINT "prode_participants_prode_id_fkey" FOREIGN KEY ("prode_id") REFERENCES "prodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prode_participants" ADD CONSTRAINT "prode_participants_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_prode_participant_id_fkey" FOREIGN KEY ("prode_participant_id") REFERENCES "prode_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predicted_scorers" ADD CONSTRAINT "predicted_scorers_prediction_id_fkey" FOREIGN KEY ("prediction_id") REFERENCES "predictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predicted_scorers" ADD CONSTRAINT "predicted_scorers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_scores" ADD CONSTRAINT "prediction_scores_prediction_id_fkey" FOREIGN KEY ("prediction_id") REFERENCES "predictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranking_cache" ADD CONSTRAINT "ranking_cache_prode_id_fkey" FOREIGN KEY ("prode_id") REFERENCES "prodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
