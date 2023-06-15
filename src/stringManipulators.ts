export function smartSplit(input: string, splitOnSubstring: string): string[] {
  // Regular expression to match "<substring> X:" where X is any number.
  const regex = new RegExp(`(?=${splitOnSubstring} \\d+:)`, 'gi');
  // Use the regular expression to split the input string.
  const result = input.split(regex);

  // Return the resulting array of substrings.
  return result;
}

// Define a function to create the colored log
export function colorizeLog(message: string): string {
  const faintGrey = '\x1b[2m'; // Faint grey color
  const resetColor = '\x1b[0m'; // Reset color code

  // Apply the color code to the message
  return `${faintGrey}${message}${resetColor}`;
}
