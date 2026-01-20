/**
 * Name validation utility
 * Validates user names with:
 * - Maximum 40 characters
 * - Only alphanumeric characters and spaces (no special characters/symbols)
 * - Profanity check
 */

// Common profanity/inappropriate words list
// This is a basic list - can be expanded or replaced with a library
const PROFANITY_WORDS = [
  // Explicit profanity
  'fuck', 'shit', 'damn', 'bitch', 'asshole', 'cunt', 'piss',
  'bastard', 'dick', 'cock', 'pussy', 'whore', 'slut',
  
  // Racial slurs
  'nigger', 'nigga', 'faggot', 'retard',
  
  // Inappropriate terms
  'kill', 'murder', 'suicide', 'kys', 'die',
  
  // Admin/system terms (to prevent confusion)
  'admin', 'administrator', 'root', 'system', 'null', 'undefined',
  
  // Reserved names
  'anonymous', 'guest', 'user', 'test', 'tester',
];

/**
 * Validates a name according to the rules:
 * - Max 40 characters
 * - Only alphanumeric characters and spaces
 * - No profanity
 */
export function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }

  const trimmedName = name.trim();

  // Check length
  if (trimmedName.length === 0) {
    return { valid: false, error: 'Name cannot be empty' };
  }

  if (trimmedName.length > 40) {
    return { valid: false, error: 'Name must be 40 characters or less' };
  }

  // Check for only alphanumeric characters and spaces
  // Allow: letters (a-z, A-Z), numbers (0-9), and spaces
  const alphanumericSpaceRegex = /^[a-zA-Z0-9\s]+$/;
  if (!alphanumericSpaceRegex.test(trimmedName)) {
    return { valid: false, error: 'Name can only contain letters, numbers, and spaces' };
  }

  // Check for profanity
  const nameLower = trimmedName.toLowerCase();
  const words = nameLower.split(/\s+/);
  
  for (const word of words) {
    // Check if word contains any profanity
    for (const profanity of PROFANITY_WORDS) {
      if (word.includes(profanity) || profanity.includes(word)) {
        return { valid: false, error: 'Name contains inappropriate content' };
      }
    }
  }

  // Check if entire name matches a profanity word
  for (const profanity of PROFANITY_WORDS) {
    if (nameLower === profanity || nameLower.replace(/\s+/g, '') === profanity) {
      return { valid: false, error: 'Name contains inappropriate content' };
    }
  }

  return { valid: true };
}

/**
 * Custom validator decorator for class-validator
 */
export function IsValidName(validationOptions?: any) {
  return function (object: any, propertyName: string) {
    // This will be used with class-validator's ValidateIf and custom validation
  };
}
