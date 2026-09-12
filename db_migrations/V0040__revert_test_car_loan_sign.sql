-- Откат тестового подписания автозайма (было изменено только в целях диагностики бага)
UPDATE t_p30184577_microfinance_website.car_loan_applications
SET contract_signed = FALSE, contract_signed_at = NULL, updated_at = NOW()
WHERE id = 1 AND phone = '+79624242424';