// Qualification Form Configuration
// This file contains the default questions and field mappings for the qualification form

export type FieldType = 'text' | 'select' | 'currency' | 'percentage' | 'email' | 'date' | 'number';

export interface FieldOption {
  value: string;
  label: string;
}

// Alternative question variant
export interface QuestionVariant {
  id: string;
  text: string;
  isDefault?: boolean;
}

export interface QualificationQuestion {
  id: string;
  question: string; // Primary/default question text
  alternatives?: QuestionVariant[]; // Alternative phrasings
  selectionMode?: 'default' | 'random'; // How to choose between alternatives
  fieldName: string | null; // Maps to homebound_qualification_form_fields.field_name
  enabled: boolean;
  order: number;
  // Inline field configuration
  inputType?: FieldType;
  fieldOptions?: FieldOption[];
  placeholder?: string;
  helpText?: string;
  isRequired?: boolean;
  zapierFieldName?: string;
}

export interface QualificationSection {
  id: string;
  title: string;
  description?: string;
  questions: QualificationQuestion[];
  enabled: boolean;
}

export interface QualificationConfig {
  sections: QualificationSection[];
  version: string;
}

// Default configuration - these questions match the existing DEFAULT_SCRIPTS structure
// and map directly to database fields in homebound_qualification_form_fields
export const DEFAULT_QUALIFICATION_CONFIG: QualificationConfig = {
  version: "1.0.0",
  sections: [
    {
      id: "property",
      title: "Property Information",
      description: "Let's gather some information about the property",
      enabled: true,
      questions: [
        {
          id: "property_type",
          question: "What type of property is this?",
          fieldName: "property_type",
          enabled: true,
          order: 1,
          inputType: "select",
          fieldOptions: [
            { value: "single_family", label: "Single Family" },
            { value: "condo", label: "Condo" },
            { value: "townhouse", label: "Townhouse" },
            { value: "multi_family", label: "Multi-family" },
          ],
          isRequired: true,
          zapierFieldName: "property_type",
        },
        {
          id: "property_occupancy",
          question: "Is this your primary residence, a second home, or an investment property?",
          fieldName: "property_occupancy",
          enabled: true,
          order: 2,
          inputType: "select",
          fieldOptions: [
            { value: "primary", label: "Primary Residence" },
            { value: "second_home", label: "Second Home" },
            { value: "investment", label: "Investment Property" },
          ],
          isRequired: true,
          zapierFieldName: "property_occupancy",
        },
        {
          id: "refinance_type",
          question: "Are you looking for additional cash-out, or are you just looking for the lowest rate & terms?",
          fieldName: "refinance_type",
          enabled: true,
          order: 3,
          inputType: "select",
          fieldOptions: [
            { value: "rate_term", label: "Rate and Term" },
            { value: "cash_out", label: "Cash Out" },
          ],
          isRequired: true,
          zapierFieldName: "refinance_type",
        },
        {
          id: "property_value",
          question: "What is your estimated property value?",
          fieldName: "property_value",
          enabled: true,
          order: 4,
          inputType: "currency",
          placeholder: "e.g., 450000",
          helpText: "Based on recent sales or online estimates",
          isRequired: true,
          zapierFieldName: "property_value",
        },
      ],
    },
    {
      id: "loan",
      title: "Current Loan Information",
      description: "Tell us about your current mortgage",
      enabled: true,
      questions: [
        {
          id: "mortgage_balance",
          question: "What is your current first mortgage balance?",
          fieldName: "current_mortgage_balance",
          enabled: true,
          order: 1,
          inputType: "currency",
          placeholder: "e.g., 280000",
          isRequired: true,
          zapierFieldName: "mortgage_balance",
        },
        {
          id: "second_mortgage",
          question: "Do you have a second mortgage? If so, what is the balance?",
          fieldName: null,
          enabled: true,
          order: 2,
          inputType: "text",
          placeholder: "e.g., No / Yes - $50,000",
          helpText: "Please note if applicable for Loan Officers",
        },
        {
          id: "interest_rate",
          question: "What is your current interest rate on this mortgage?",
          fieldName: "current_interest_rate",
          enabled: true,
          order: 3,
          inputType: "percentage",
          placeholder: "e.g., 6.5",
          isRequired: true,
          zapierFieldName: "interest_rate",
        },
      ],
    },
    {
      id: "financial",
      title: "Financial Information",
      description: "Help us understand your financial situation",
      enabled: true,
      questions: [
        {
          id: "annual_income",
          question: "What is your annual gross income?",
          fieldName: "annual_income",
          enabled: true,
          order: 1,
          inputType: "currency",
          placeholder: "e.g., 85000",
          isRequired: true,
          zapierFieldName: "annual_income",
        },
        {
          id: "credit_score",
          question: "What is your approximate credit score range?",
          fieldName: "credit_score_range",
          enabled: true,
          order: 2,
          inputType: "select",
          fieldOptions: [
            { value: "excellent", label: "Excellent (740+)" },
            { value: "good", label: "Good (700-739)" },
            { value: "fair", label: "Fair (660-699)" },
            { value: "poor", label: "Poor (below 660)" },
          ],
          isRequired: true,
          zapierFieldName: "credit_score_range",
        },
        {
          id: "monthly_debts",
          question: "What are your total monthly debt obligations?",
          fieldName: "monthly_debt_payments",
          enabled: true,
          order: 3,
          inputType: "currency",
          placeholder: "e.g., 1200",
          helpText: "Credit cards, car loans, personal loans, medical debts, etc.",
          isRequired: true,
          zapierFieldName: "monthly_debts",
        },
      ],
    },
  ],
};

// Helper to get enabled sections only
export const getEnabledSections = (config: QualificationConfig): QualificationSection[] => {
  return config.sections.filter(section => section.enabled);
};

// Helper to get enabled questions for a section
export const getEnabledQuestions = (section: QualificationSection): QualificationQuestion[] => {
  return section.questions
    .filter(q => q.enabled)
    .sort((a, b) => a.order - b.order);
};

// Helper to get all field names that have questions mapped
export const getMappedFieldNames = (config: QualificationConfig): string[] => {
  return config.sections
    .flatMap(section => section.questions)
    .filter(q => q.fieldName !== null)
    .map(q => q.fieldName as string);
};

// Convert legacy DEFAULT_SCRIPTS format to new config format
export const convertLegacyScriptsToConfig = (
  legacyScripts: Record<string, { title: string; content: string; enabled?: boolean[] }>
): QualificationConfig => {
  const sections: QualificationSection[] = [];

  for (const [sectionId, script] of Object.entries(legacyScripts)) {
    // Skip personal section - it auto-populates from VICI
    if (sectionId === 'personal') continue;

    const questions = script.content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('(') && !line.startsWith('['));

    const defaultSection = DEFAULT_QUALIFICATION_CONFIG.sections.find(s => s.id === sectionId);

    sections.push({
      id: sectionId,
      title: script.title || defaultSection?.title || sectionId,
      description: defaultSection?.description,
      enabled: true,
      questions: questions.map((question, index) => {
        // Try to find matching default question for field mapping
        const defaultQuestion = defaultSection?.questions.find(q => 
          question.toLowerCase().includes(q.id.replace('_', ' ')) ||
          q.question.toLowerCase().includes(question.substring(0, 20).toLowerCase())
        );

        return {
          id: `${sectionId}_q${index + 1}`,
          question,
          fieldName: defaultQuestion?.fieldName || null,
          enabled: script.enabled ? script.enabled[index] !== false : true,
          order: index + 1,
        };
      }),
    });
  }

  return {
    version: "1.0.0",
    sections,
  };
};

// Serialize config for database storage
export const serializeConfig = (config: QualificationConfig): string => {
  return JSON.stringify(config);
};

// Deserialize config from database
export const deserializeConfig = (data: string): QualificationConfig | null => {
  try {
    const parsed = JSON.parse(data);
    if (parsed && parsed.sections && Array.isArray(parsed.sections)) {
      return parsed as QualificationConfig;
    }
    return null;
  } catch {
    return null;
  }
};
