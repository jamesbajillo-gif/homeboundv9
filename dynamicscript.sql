CREATE TABLE `homebound_script` (
  `id` int(11) NOT NULL,
  `step_name` varchar(255) NOT NULL,
  `title` text NOT NULL,
  `content` text NOT NULL,
  `button_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `homebound_script` (`id`, `step_name`, `title`, `content`, `button_config`, `created_at`, `updated_at`) VALUES
(1, 'greeting', '1 - Opening Greeting', '\"Good [morning/afternoon/evening], this is [Your Name] calling from [Company Name]. Am I speaking with [Customer Name]?\"\r\n\r\n[Wait for confirmation]\r\n\r\n\"Great! How are you doing today?\"\r\n\r\n[Brief acknowledgment]\r\n\r\n\"I appreciate you taking my call. I\'m reaching out today because...\"', NULL, '2025-12-15 01:41:48', '2025-12-15 13:47:06'),
(2, 'objectionHandling', '1a - Common Objections', '\"I\'m not interested\"\n-> \"I understand. May I ask what specifically doesn\'t interest you? That way I can make sure I\'m not wasting your time.\"\n\n\"Send me information\"\n-> \"I\'d be happy to! To make sure I send you the most relevant information, can I ask you a few quick questions?\"\n\n\"I need to think about it\"\n-> \"Of course, this is an important decision. What specific aspects would you like to think about? Maybe I can help clarify those now.\"', NULL, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(3, 'qualification', '2 - Qualification Questions', '1. \"Can you tell me a bit about your current [solution/process]?\"\n\n2. \"What challenges are you facing with [specific area]?\"\n\n3. \"Have you considered making any changes in the near future?\"\n\n4. \"Who else in your organization would be involved in this decision?\"', NULL, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(4, 'closingNotInterested', '3a - Closing (Not Interested)', '\"I completely understand, [Name]. I appreciate you taking the time to speak with me today.\n\nJust so I don\'t bother you again with something that\'s not relevant - can I ask what specifically doesn\'t interest you? Is it:\n  • The timing?\n  • The solution itself?\n  • Budget concerns?\n\n[Listen to response]\n\n\"I appreciate that feedback. Let me make a note of that in our system.\n\nIf your situation changes in the future, would it be okay if I reach out to you in [3/6/12] months just to check in?\n\n[If yes]: \"Perfect. I\'ll make a note to follow up then.\"\n\n[If no]: \"No problem at all. I\'ll make sure you\'re not contacted again.\"\n\nThank you again for your time, [Name]. I wish you all the best with [mention their business/situation if applicable]. Have a great rest of your day!\"\n\n[End call professionally]', NULL, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(5, 'closingSuccess', '3b - Closing Spiel (Successful)', '\"Based on what we\'ve discussed, it sounds like this could be a great fit for [specific need they mentioned]. \n\nWould you be open to [next step - demo/meeting/trial]?\n\n[If yes]: \"Excellent! Let me check my calendar. Would [day/time] or [day/time] work better for you?\"\n\n[If no]: \"I understand. May I follow up with you in [timeframe] to see if your situation has changed?\"\n\n\"Thank you so much for your time today, [Name]. I look forward to [next step].\"', NULL, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(6, 'outbound_greeting', '1 - Opening Greeting (Outbound)', '\"Good [morning/afternoon/evening], this is [Your Name] calling from [Company Name]. Am I speaking with [Customer Name]?\"\n\n[Wait for confirmation]\n\n\"Great! How are you doing today?\"\n\n[Brief acknowledgment]\n\n\"I appreciate you taking my call. I\'m reaching out today because...\"', '[]', '2025-12-15 01:41:48', '2025-12-15 20:49:19'),
(7, 'outbound_objection', '1a - Common Objections (Outbound)', '\"I\'m not interested\"\n-> \"I understand. May I ask what specifically doesn\'t interest you? That way I can make sure I\'m not wasting your time.\"\n\n\"Send me information\"\n-> \"I\'d be happy to! To make sure I send you the most relevant information, can I ask you a few quick questions?\"\n\n\"I need to think about it\"\n-> \"Of course, this is an important decision. What specific aspects would you like to think about? Maybe I can help clarify those now.\"', '[]', '2025-12-15 01:41:48', '2025-12-15 20:49:27'),
(8, 'outbound_qualification', '2 - Qualification Questions (Outbound)', '{\n  \"personal\": {\n    \"title\": \"Personal Information\",\n    \"content\": \"(Fields auto-populate from VICI lead data - verify accuracy with borrower)\"\n  },\n  \"property\": {\n    \"title\": \"Property Information\",\n    \"content\": \"Type of property (single family, condo, etc.)\\n\\nIs this your Primary residence?\\nis this a second home or its your investment proerty that we are talking about?\\n\\nAre you you looking for additional cash-out or your just looking for the lowest rate & terms?\\n\\nWhat is your property value? what have you seen online? or have you seen any current sales in your neighbourhood?\"\n  },\n  \"loan\": {\n    \"title\": \"Current Loan Information\",\n    \"content\": \"Current first mortgage balance & payment\\n\\nCurrent second mortgage balance & payment (if applicable) (Please taker note in your end if they have and inform he Loan Officers)\\n\\nWhat is your interest rate for this mortgage( Applicable in both First & Second Mortgage)\"\n  },\n  \"financial\": {\n    \"title\": \"Financial Information\",\n    \"content\": \"What is yor annual gross income?\\n\\nApproximate credit score?\\n\\nTotal credit obligations (credit cards, personal loans, car loans, medical debts etc.)\"\n  }\n}', '[]', '2025-12-15 01:41:48', '2025-12-15 20:49:23'),
(9, 'outbound_closingNotInterested', '3a - Closing (Not Interested) (Outbound)', 'I completely understand. Thank you for taking the time to speak with me today, [Name].\n\nIf your situation changes in the future, please don\'t hesitate to reach out. We\'re always here to help.\n\nIs there anything else I can assist you with before we end the call?\n\n[If no]: \"Alright, thank you again for your time. Have a great day!\"', '[]', '2025-12-15 01:41:48', '2025-12-15 20:49:30'),
(10, 'outbound_closingSuccess', '3b - Closing (Successful) (Outbound)', '\"Based on what we\'ve discussed, it sounds like this could be a great fit for [specific need they mentioned].\n\nWould you be open to [next step - demo/meeting/trial]?\n\n[If yes]: \"Excellent! Let me check my calendar. Would [day/time] or [day/time] work better for you?\"\n\n[If no]: \"I understand. May I follow up with you in [timeframe] to see if your situation has changed?\"\n\n\"Thank you so much for your time today, [Name]. I look forward to [next step].\"', '[]', '2025-12-15 01:41:48', '2025-12-15 20:54:19');

CREATE TABLE `list_id_config` (
  `id` int(11) NOT NULL,
  `list_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `step_name` varchar(255) DEFAULT NULL,
  `title` text DEFAULT NULL,
  `content` text NOT NULL DEFAULT '',
  `properties` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `list_id_config` (`id`, `list_id`, `name`, `step_name`, `title`, `content`, `properties`, `created_at`, `updated_at`) VALUES
(16, '11000', 'FHA STREAMLINE', 'greeting', 'Opening Greeting', 'Hi, may I speak with [Client Name] please?\n\"Hi [Client Name], we are reaching out because your file was tagged as a great candidate for a No Income, No Appraisal FHA Streamline Refinance, which may help you lower your monthly mortgage payment or simplify your refinance. Do you have a few minutes to discuss your options with our mortgage loan officers?\"\nUse the same current questionnaire and we have in the script and use the same transfer lines.\n', NULL, '2025-12-15 21:29:39', '2025-12-15 21:52:25'),
(18, '11000', 'FHA STREAMLINE', 'qualification', 'Qualification Questions', '{\n  \"personal\": {\n    \"title\": \"Personal Information\",\n    \"content\": \"(No content - fields auto-populate from VICI)\"\n  },\n  \"property\": {\n    \"title\": \"Property Information\",\n    \"content\": \"Type of property (single family, condo, etc.)\\n\\nIs this your Primary residence?\\nis this a second home or its your investment proerty that we are talking about?\\n\\nAre you you looking for additional cash-out or your just looking for the lowest rate & terms?\\n\\nWhat is your property value? what have you seen online? or have you seen any current sales in your neighbourhood?\"\n  },\n  \"loan\": {\n    \"title\": \"Current Loan Information\",\n    \"content\": \"Current first mortgage balance & payment\\n\\nCurrent second mortgage balance & payment (if applicable) (Please taker note in your end if they have and inform he Loan Officers)\\n\\nWhat is your interest rate for this mortgage( Applicable in both First & Second Mortgage)\"\n  },\n  \"financial\": {\n    \"title\": \"Financial Information\",\n    \"content\": \"What is yor annual gross income?\\n\\nApproximate credit score?\\n\\nTotal credit obligations (credit cards, personal loans, car loans, medical debts etc.)\"\n  }\n}', NULL, '2025-12-15 21:29:57', '2025-12-15 21:52:25'),
(19, '11000', 'FHA STREAMLINE', 'objectionHandling', 'Common Objections', '\n\"I\'m not interested in refinancing right now.\"\nRebuttal:\n\"I completely understand. Many of our clients felt the same way at first, but they were surprised to learn how much they could potentially save with very little paperwork and no appraisal. Even if you\'re just curious, a quick 15-minute consultation can show you your options—there\'s no obligation to move forward. Would you like me to schedule that?\"\n________________________________________\n2. Objection: \"Will this hurt my credit score?\"\nRebuttal:\n\"Great question. The initial eligibility check does not affect your credit score at all. Only if you decide to formally apply will there be a small credit pull, which is standard in the mortgage process. So you can explore your options without any risk to your credit.\"\n________________________________________\n3. Objection: \"I don\'t have time right now.\"\nRebuttal:\n\"I understand—everyone\'s busy. The good news is the consultation is only about 15 minutes, and we can schedule it at a time that works best for you—even evenings or weekends. Would you like me to find a time that fits your schedule?\"\n________________________________________\n4. Objection: \"I already refinanced recently.\"\nRebuttal:\n\"That\'s understandable. FHA Streamline Refinances do have eligibility rules, but even homeowners who refinanced a while ago sometimes qualify for additional savings. We can quickly check your situation with no obligation and no impact to your credit. Can I schedule a quick review with a loan officer?\"\n________________________________________\n5. Objection: \"Is there a fee?\"\nRebuttal:\n\"No, checking your eligibility is completely free. The purpose of our call is simply to see if you qualify and show you potential savings. There\'s no cost or obligation at this stage. Would you like to schedule a short consultation to review your options?\"\n', NULL, '2025-12-15 21:30:10', '2025-12-15 21:52:25'),
(20, '12000', 'VA IRRRL STREAMLINE', 'greeting', 'Opening Greeting', '', NULL, '2025-12-15 22:24:14', '2025-12-15 22:24:14'),
(21, '12000', 'VA IRRRL STREAMLINE', 'objectionHandling', 'Common Objections', 'Objection 1: \"I\'m not interested right now.\"\nRebuttal:\n\"I understand. Many of our clients felt the same way at first, but they were surprised at how much they could save with very little effort. Even if you\'re just curious, a 15-minute consultation can show your potential savings—there\'s no obligation. Would you like to schedule that?\"\n________________________________________\nObjection 2: \"Will this hurt my credit score?\"\nRebuttal:\n\"The initial pre-qualification for a VA Streamline does not affect your credit. Only a formal application would involve a credit pull, which is standard in mortgage refinances.\"\n________________________________________\nObjection 3: \"I don\'t have time right now.\"\nRebuttal:\n\"I understand. The VA Streamline process is fast, and a consultation takes only about 15 minutes. We can schedule it at a time convenient for you—even evenings or weekends. When would be best?\"\n________________________________________\nObjection 4: \"I just refinanced my VA loan recently.\"\nRebuttal:\n\"That\'s understandable. VA rules have certain timelines, but even borrowers who refinanced recently sometimes qualify for additional savings. We can quickly check your eligibility with no obligation and no credit impact. Can I schedule a short review?\"\n________________________________________\nObjection 5: \"Is there a fee?\"\nRebuttal:\n\"No, there\'s no cost to see if you qualify for a VA Streamline. The purpose of our call is to determine eligibility and potential savings. If it looks like a fit, your loan officer will walk you through the next steps.\"\n', NULL, '2025-12-15 22:32:54', '2025-12-15 22:32:54');

CREATE TABLE `qualification_form_fields` (
  `id` int(11) NOT NULL,
  `field_name` varchar(255) NOT NULL,
  `field_label` varchar(255) NOT NULL,
  `field_type` varchar(50) NOT NULL,
  `field_section` varchar(50) NOT NULL,
  `field_options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `is_required` tinyint(1) DEFAULT 1,
  `zapier_field_name` varchar(255) DEFAULT NULL,
  `placeholder` varchar(255) DEFAULT NULL,
  `help_text` text DEFAULT NULL,
  `validation_rules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `display_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `qualification_form_fields` (`id`, `field_name`, `field_label`, `field_type`, `field_section`, `field_options`, `is_required`, `zapier_field_name`, `placeholder`, `help_text`, `validation_rules`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'customer_email', 'Customer Email Address', 'email', 'personal', NULL, 1, 'borrower_email', 'john.doe@email.com', 'Email address for loan communications', NULL, 1, 1, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(2, 'borrower_first_name', 'First Name', 'text', 'personal', NULL, 1, 'borrower_first_name', 'John', NULL, NULL, 2, 1, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(3, 'borrower_last_name', 'Last Name', 'text', 'personal', NULL, 1, 'borrower_last_name', 'Doe', NULL, NULL, 3, 1, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(4, 'borrower_phone', 'Phone Number', 'phone', 'personal', NULL, 1, 'borrower_phone', '(555) 123-4567', 'Phone number from lead data', NULL, 4, 1, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(5, 'borrower_date_of_birth', 'Birthday', 'date', 'personal', NULL, 1, 'borrower_date_of_birth', 'MM/DD/YYYY', NULL, NULL, 5, 1, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(6, 'borrower_address', 'Address', 'text', 'personal', NULL, 1, 'borrower_address', '123 Main Street', NULL, NULL, 6, 1, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(7, 'borrower_state', 'State', 'text', 'personal', NULL, 1, 'borrower_state', 'CA', '2-letter state code', NULL, 7, 1, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(8, 'borrower_city', 'City', 'text', 'personal', NULL, 1, 'borrower_city', 'Los Angeles', NULL, NULL, 8, 1, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(9, 'borrower_postal_code', 'ZIP Code', 'text', 'personal', NULL, 1, 'borrower_postal_code', '90210', '5-digit ZIP code', NULL, 9, 1, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(10, 'property_value', 'Property Value', 'currency', 'property', '{\"min\": 0, \"max\": 10000000}', 1, 'property_value', '$1,000,000', NULL, '{\"min\": 0, \"max\": 10000000}', 10, 1, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(11, 'property_type', 'Property Type', 'select', 'property', '{\"options\":[{\"value\":\"SINGLE_FAMILY_DETACHED\",\"label\":\"Single Family Detached\"},{\"value\":\"SINGLE_FAMILY_ATTACHED\",\"label\":\"Single Family Attached\"},{\"value\":\"TWO_UNITS\",\"label\":\"2 Units\"},{\"value\":\"THREE_UNITS\",\"label\":\"3 Units\"}]}', 1, 'property_type', 'Select Type', NULL, NULL, 11, 1, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(12, 'property_occupancy', 'Property Usage Type', 'select', 'property', '{\"options\":[{\"value\":\"PrimaryResidence\",\"label\":\"Primary Residence\"},{\"value\":\"Investment\",\"label\":\"Investment\"},{\"value\":\"SecondHome\",\"label\":\"Second Home\"}]}', 1, 'property_occupancy', 'Select Usage', NULL, NULL, 12, 1, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(13, 'refinance_type', 'Refinance Type', 'select', 'property', '{\"options\":[{\"value\":\"CashOut\",\"label\":\"Cash-Out Refinance\"},{\"value\":\"NoCashOut\",\"label\":\"Rate & Term Refinance\"},{\"value\":\"LimitedCashOut\",\"label\":\"Limited Cash-Out Refinance\"}]}', 1, 'refinance_type', 'Select Type', NULL, NULL, 13, 1, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(14, 'current_mortgage_balance', 'Current Mortgage Balance', 'currency', 'loan', NULL, 1, 'current_mortgage_balance', '$400,000', NULL, '{\"min\": 0}', 20, 1, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(15, 'current_interest_rate', 'Current Interest Rate', 'percentage', 'loan', NULL, 1, 'current_interest_rate', '6.5%', NULL, '{\"min\": 0, \"max\": 100}', 21, 1, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(16, 'annual_income', 'Annual Household Income', 'currency', 'financial', NULL, 1, 'annual_income', '$100,000', NULL, '{\"min\": 0}', 30, 1, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(17, 'credit_score_range', 'Credit Score Range', 'select', 'financial', '{\"options\":[{\"value\":\"780-850\",\"label\":\"Excellent (780-850)\"},{\"value\":\"720-779\",\"label\":\"Very Good (720-779)\"},{\"value\":\"680-719\",\"label\":\"Good (680-719)\"},{\"value\":\"620-679\",\"label\":\"Fair (620-679)\"},{\"value\":\"500-619\",\"label\":\"Poor (500-619)\"}]}', 1, 'credit_score_range', 'Select Range', NULL, NULL, 31, 1, '2025-12-15 01:41:48', '2025-12-15 01:41:48'),
(18, 'monthly_debt_payments', 'Monthly Debt Payments', 'currency', 'financial', NULL, 1, 'monthly_debt_payments', '$2,500', 'Include credit cards, car loans, other monthly debts', '{\"min\": 0}', 32, 1, '2025-12-15 01:41:48', '2025-12-15 01:41:48');

CREATE TABLE `user_groups` (
  `id` int(11) NOT NULL,
  `user_identifier` varchar(255) NOT NULL,
  `group_type` enum('inbound','outbound') NOT NULL DEFAULT 'inbound',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `zapier_settings` (
  `id` int(11) NOT NULL,
  `webhook_url` varchar(500) NOT NULL,
  `webhook_name` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `zapier_settings` (`id`, `webhook_url`, `webhook_name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'https://hooks.zapier.com/hooks/catch/24751495/u10d1kd/', 'Sample Webhook (Replace with yours)', 'This is the sample webhook URL from Zapier documentation. Replace this with your actual Zapier webhook URL from your Zap configuration.', 1, '2025-12-15 01:41:48', '2025-12-15 14:36:17'),
(3, 'WEBHOOK_URL_1', 'WEBHOOK_NAME_1', 'DESCRIPTION_1', 1, '2025-12-15 14:36:27', '2025-12-15 14:36:27'),
(4, 'WEBHOOK_URL_2', 'WEBHOOK_NAME_2', 'DESCRIPTION_2', 1, '2025-12-15 14:36:27', '2025-12-15 14:36:27');

ALTER TABLE `homebound_script`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `step_name` (`step_name`),
  ADD KEY `idx_step_name` (`step_name`);

ALTER TABLE `list_id_config`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_list_step` (`list_id`,`step_name`),
  ADD KEY `idx_list_id` (`list_id`),
  ADD KEY `idx_step_name` (`step_name`);

ALTER TABLE `qualification_form_fields`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `field_name` (`field_name`),
  ADD KEY `idx_field_section` (`field_section`),
  ADD KEY `idx_display_order` (`display_order`),
  ADD KEY `idx_is_active` (`is_active`);

ALTER TABLE `user_groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_identifier` (`user_identifier`),
  ADD KEY `idx_user_identifier` (`user_identifier`),
  ADD KEY `idx_group_type` (`group_type`);

ALTER TABLE `zapier_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `webhook_url` (`webhook_url`),
  ADD KEY `idx_is_active` (`is_active`);

ALTER TABLE `homebound_script`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

ALTER TABLE `list_id_config`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

ALTER TABLE `qualification_form_fields`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

ALTER TABLE `user_groups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `zapier_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
