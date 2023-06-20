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

export function truncateOutputAtStoppingString(
  output: string,
  stoppingStrings: string[]
): string {
  let truncatedOutput = output;

  for (const stoppingString of stoppingStrings) {
    const index = truncatedOutput.indexOf(stoppingString);
    if (index !== -1) {
      truncatedOutput = output.substring(0, index);
    }
  }
  if (truncatedOutput.length !== output.length) {
    console.log('### SYSTEM LOG: output was truncated');
  }
  return truncatedOutput.trim();
}

export function removeTripleQuotes(str: string): string {
  if (str.startsWith('"""') && str.endsWith('"""')) {
    return str.slice(3, -3);
  } else {
    return str;
  }
}
