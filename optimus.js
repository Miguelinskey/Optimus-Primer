const fs = require('fs');
const path = require('path');
const fastcsv = require('fast-csv');
const tinycolor = require('tinycolor2');

// Helper function to read CSS file content
function readCSSFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file: ${filePath}. Error: ${error.message}`);
    return '';
  }
}

/*
 *= require component_preview.css
 *= require_self
 *= require @primer/primitives/tokens-next-private/css/base/size/size.css
 *= require @primer/primitives/tokens-next-private/css/base/typography/typography.css
 *= require @primer/primitives/tokens-next-private/css/functional/size/border.css
 *= require @primer/primitives/tokens-next-private/css/functional/size/breakpoints.css
 *= require @primer/primitives/tokens-next-private/css/functional/size/size-coarse.css
 *= require @primer/primitives/tokens-next-private/css/functional/size/size-fine.css
 *= require @primer/primitives/tokens-next-private/css/functional/size/size.css
 *= require @primer/primitives/tokens-next-private/css/functional/size/viewport.css
 *= require @primer/primitives/tokens-next-private/css/functional/typography/typography.css
 *= require @primer/css/dist/color-modes.css
 *= require @primer/css/dist/base.css
 *= require @primer/css/dist/buttons.css
 *= require @primer/css/dist/layout.css
 *= require @primer/css/dist/utilities.css
 *= require @primer/css/dist/markdown.css
*/

// Function to read Primer Primitives CSS files and concatenate them
function concatenatePrimerCSS() {
  const primerCssPaths = [
    './node_modules/@primer/primitives/tokens-next-private/css/base/size/size.css',
    './node_modules/@primer/primitives/tokens-next-private/css/base/typography/typography.css',
    './node_modules/@primer/primitives/tokens-next-private/css/functional/size/border.css',
    './node_modules/@primer/primitives/tokens-next-private/css/functional/size/breakpoints.css',
    './node_modules/@primer/primitives/tokens-next-private/css/functional/size/size-coarse.css',
    './node_modules/@primer/primitives/tokens-next-private/css/functional/size/size-fine.css',
    './node_modules/@primer/primitives/tokens-next-private/css/functional/size/size.css',
    './node_modules/@primer/primitives/tokens-next-private/css/functional/size/viewport.css',
    './node_modules/@primer/primitives/tokens-next-private/css/functional/typography/typography.css'
  ];

  return primerCssPaths.map(filePath => {
    // Extract the filename for the comment
    const fileName = path.basename(filePath);
    // Read file content
    const fileContent = readCSSFile(filePath);
    // Prepend the comment and the content
    return `/* ${fileName} */\n${fileContent}`;
  }).join('\n\n'); // Separate each file's content with a newline for better readability
}

function rgba(hexColor, alpha) {
  if (!hexColor) {
      console.error('Error: hexColor is undefined or null');
      return '';
  }

  try {
      const color = tinycolor(hexColor);
      return alpha !== undefined && alpha !== '' ? color.setAlpha(alpha).toRgbString() : color.toRgbString();
  } catch (error) {
      console.error(`RGBA process failed. (Error: ${error.message})`);
      return '';
  }
}

function processVariable(method, variableName, scaleToken, alpha, scale) {
  if (!variableName || !scaleToken) {
      console.error('Variable or token is undefined. Skipping row.');
      return '';
  }

  // Trim spaces from scaleToken
  scaleToken = scaleToken.trim();

  if (!scale[scaleToken]) {
      console.error(`Scale token "${scaleToken}" not found. Skipping variable "${variableName}".`);
      return '';
  }

  try {
      let result;
      if (method === 'rgba') {
          result = `${variableName}: ${rgba(scale[scaleToken], alpha)};`;
      } else if (method === 'hex') {
          result = `${variableName}: ${scale[scaleToken]};`;
      } else {
          throw new Error(`Unsupported method: ${method}`);
      }

      console.log(`Successfully processed variable "${variableName}" using method "${method}"`);
      return result;
  } catch (error) {
      console.error(`Process failed for variable "${variableName}". (Error: ${error.message})`);
      return '';
  }
}

function processVariables(variables, scale) {
  const failedVariables = [];

  const processed = variables
      .filter(({ method }) => method && method.toLowerCase() !== 'skip' && method.toLowerCase() !== 'shadow')
      .map(({ method, variableName, scaleToken, alpha }) => {
          const result = processVariable(method, variableName, scaleToken, alpha, scale);
          if (!result) failedVariables.push(variableName);
          return result;
      });

  console.log('Failed Variables:', failedVariables);
  return processed.filter(Boolean); // Filter out empty strings
}

// Reads the CSV and JSON files, processes the variables, and generates the final CSS
function buildTheme() {
    const rows = [];
  
    fs.createReadStream('data/input/theme.csv')
      .pipe(fastcsv.parse({ headers: true }))
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', () => {
        console.log('Number of rows in CSV:', rows.length);
  
        const scaleData = fs.readFileSync('data/input/scale.json', 'utf-8');
        const scaleVariables = JSON.parse(scaleData);
  
        const processedVariables = processVariables(rows, scaleVariables);
        const customVariablesOutput = processedVariables.join('\n');
  
        // Read the Primer CSS files and concatenate them with the custom variables
        const primerCSSContent = concatenatePrimerCSS();
        const finalCSSContent = `${primerCSSContent}\n/* Primo Theme Override */\n:root {\n${customVariablesOutput}\n}`;
  
        // Write the final CSS content to the output.css file
        fs.writeFileSync('data/output/output.css', finalCSSContent, 'utf-8');
        console.log('Build process completed!');
      });
  }
  
  // Start the build process
  buildTheme();