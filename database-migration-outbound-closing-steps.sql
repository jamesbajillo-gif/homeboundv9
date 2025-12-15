-- Migration: Add outbound closing steps (closingNotInterested and closingSuccess)
-- Run this in your Supabase SQL Editor to add the missing outbound closing steps

INSERT INTO public.homebound_script (step_name, title, content) 
VALUES 
  (
    'outbound_closingNotInterested', 
    '4a - Closing (Not Interested)', 
    'I completely understand. Thank you for taking the time to speak with me today, [Name].

If your situation changes in the future, please don''t hesitate to reach out. We''re always here to help.

Is there anything else I can assist you with before we end the call?

[If no]: "Alright, thank you again for your time. Have a great day!"'
  ),
  (
    'outbound_closingSuccess', 
    '4b - Closing (Successful)', 
    'Based on what we''ve discussed, it sounds like this could be a great fit for [specific need they mentioned].

Would you be open to [next step - demo/meeting/trial]?

[If yes]: "Excellent! Let me check my calendar. Would [day/time] or [day/time] work better for you?"

[If no]: "I understand. May I follow up with you in [timeframe] to see if your situation has changed?"

"Thank you so much for your time today, [Name]. I look forward to [next step]."'
  )
ON CONFLICT (step_name) DO UPDATE 
SET 
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  updated_at = now();
