-- Script para limpiar la base de datos manteniendo solo el admin global

DO $$
DECLARE
    v_admin_user_id TEXT;
    v_admin_company_id TEXT;
BEGIN
    -- Obtener el ID del usuario admin global
    SELECT id INTO v_admin_user_id FROM users WHERE role = 'admin_global' LIMIT 1;
    
    -- Obtener el ID de la empresa admin (por slug 'admin')
    SELECT id INTO v_admin_company_id FROM companies WHERE slug = 'admin' LIMIT 1;
    
    RAISE NOTICE 'Admin global ID: %', v_admin_user_id;
    RAISE NOTICE 'Admin company ID: %', v_admin_company_id;
    
    -- Eliminar en orden correcto respetando foreign keys
    
    -- 1. Eliminar ranking cache
    DELETE FROM ranking_cache 
    WHERE prode_id IN (SELECT id FROM prodes WHERE company_id != v_admin_company_id OR v_admin_company_id IS NULL);
    
    -- 2. Eliminar prediction scores
    DELETE FROM prediction_scores 
    WHERE prediction_id IN (
        SELECT p.id FROM predictions p
        JOIN prode_participants pp ON p.prode_participant_id = pp.id
        JOIN employees e ON pp.employee_id = e.id
        WHERE e.user_id != v_admin_user_id
    );
    
    -- 3. Eliminar predicted scorers
    DELETE FROM predicted_scorers
    WHERE prediction_id IN (
        SELECT p.id FROM predictions p
        JOIN prode_participants pp ON p.prode_participant_id = pp.id
        JOIN employees e ON pp.employee_id = e.id
        WHERE e.user_id != v_admin_user_id
    );
    
    -- 4. Eliminar predicciones
    DELETE FROM predictions
    WHERE prode_participant_id IN (
        SELECT pp.id FROM prode_participants pp
        JOIN employees e ON pp.employee_id = e.id
        WHERE e.user_id != v_admin_user_id
    );
    
    -- 5. Eliminar participantes de prodes
    DELETE FROM prode_participants
    WHERE employee_id IN (SELECT id FROM employees WHERE user_id != v_admin_user_id);
    
    -- 6. Eliminar configuraciones de variables de prodes
    DELETE FROM prode_variable_configs
    WHERE prode_id IN (SELECT id FROM prodes WHERE company_id != v_admin_company_id OR v_admin_company_id IS NULL);
    
    -- 7. Eliminar configuraciones de ranking de prodes
    DELETE FROM prode_ranking_configs
    WHERE prode_id IN (SELECT id FROM prodes WHERE company_id != v_admin_company_id OR v_admin_company_id IS NULL);
    
    -- 8. Eliminar prodes (excepto los de la empresa admin)
    DELETE FROM prodes 
    WHERE company_id != v_admin_company_id OR v_admin_company_id IS NULL;
    
    -- 9. Eliminar empleados (excepto el admin)
    DELETE FROM employees WHERE user_id != v_admin_user_id;
    
    -- 10. Eliminar áreas de empresas (excepto las de la empresa admin)
    DELETE FROM company_areas 
    WHERE company_id != v_admin_company_id OR v_admin_company_id IS NULL;
    
    -- 11. Eliminar audit logs (excepto los del admin y su empresa)
    DELETE FROM audit_logs 
    WHERE user_id != v_admin_user_id 
    AND (company_id != v_admin_company_id OR company_id IS NULL);
    
    -- 12. Eliminar empresas (excepto la empresa admin)
    DELETE FROM companies 
    WHERE id != v_admin_company_id OR v_admin_company_id IS NULL;
    
    -- 13. Eliminar usuarios (excepto admin global)
    DELETE FROM users WHERE id != v_admin_user_id;
    
    RAISE NOTICE 'Base de datos limpiada exitosamente, preservando Admin Global y empresa Admin';
END $$;

-- Verificar usuarios restantes
SELECT id, email, role, created_at FROM users ORDER BY created_at;

-- Verificar que no haya empresas
SELECT COUNT(*) as total_companies FROM companies;

-- Verificar que no haya empleados
SELECT COUNT(*) as total_employees FROM employees;
