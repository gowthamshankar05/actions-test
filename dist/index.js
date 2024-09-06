const core = require('@actions/core');
const axios = require('axios');
const fs = require('fs');
const path = require('path');


function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Directory created: ${dirPath}`);
  }
}

async function getReleaseInfo(repo, releaseTag, githubToken){
  const releaseURL = `https://api.github.com/repos/${repo}/releases/tags/${releaseTag}`;
  try {
    const response = await axios.get(releaseURL, {
      headers: {
        Authorization: `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
});
    return response.data;
} catch (error) {
  throw new Error(`Failed to download asset: ${error.message}`);
  }
}

function findAssetUrl(releaseData, assetName){
  const asset = releaseData.assets.find(a => a.name === assetName);
  if (!asset) {
    throw new Error(`Asset ${assetName} not found in the release`);
  }
  return asset.url;
}

async function downloadAsset(assetUrl, downloadPath, assetName, githubToken) {
  try {
    const response = await axios({
      url: assetUrl,
      method: 'GET',
      headers: {
        Authorization: `token ${githubToken}`,
        'Accept': 'application/octet-stream'
      },
      responseType: 'stream'
    });

    const filePath = path.join(downloadPath, assetName);
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Downloaded ${assetName} to ${filePath}`);
        resolve(filePath);
      });
      writer.on('error', reject);
    });
  } catch (error) {
    throw new Error(`Failed to download asset: ${error.message}`);
  }
}

async function run() {
  try {
    // Inputs
    const repo = core.getInput('repo'); // e.g., "org/repo-name"
    const releaseTag = core.getInput('release_tag'); // e.g., "v1.0.0"
    const assetName = core.getInput('asset_name'); // e.g., "myfile.zip"
    const githubToken = core.getInput('github_token'); // GitHub token for authentication
    const downloadPath = core.getInput('download_path') || './'; // Local download path

    // Ensure download directory exists
    ensureDirectoryExists(downloadPath);

    // Get release information
    const releaseData = await getReleaseInfo(repo, releaseTag, githubToken);

    // Find asset URL
    const assetUrl = findAssetUrl(releaseData, assetName);

    // Download the asset
    const downloadedFilePath = await downloadAsset(assetUrl, downloadPath, assetName, githubToken);

    // Set output
    core.setOutput('downloaded_file', downloadedFilePath);
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();