-- TraceIQ DB initialization script
-- Runs on container entrypoint

\c traceiq;

\i /docker-entrypoint-initdb.d/schema.sql;

INSERT INTO applications (id, name, environment, description)
VALUES 
    ('app_auth', 'auth-service', 'production', 'Authentication and authorization microservice handling JWTs and OAuth'),
    ('app_payment', 'payment-gateway', 'production', 'Payment processing and Stripe integration gateway'),
    ('app_orders', 'order-service', 'production', 'Order lifecycle, checkout, and inventory reservation service'),
    ('app_inventory', 'inventory-api', 'production', 'Warehouse inventory catalog and stock allocation service'),
    ('app_userdb', 'user-db-cluster', 'production', 'Distributed user profile and credentials storage layer')
ON CONFLICT (name) DO NOTHING;
