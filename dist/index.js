const core = require('@actions/core');

try {
  const myInput = core.getInput('my-input');
  console.log(`Received input: ${myInput}`);
  
  // Set an output value
  core.setOutput('my-output', 'some-value');
} catch (error) {
  core.setFailed(`Action failed with error: ${error.message}`);
}