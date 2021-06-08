/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
const path = require('path');
const fs = require('fs');
const glob = require('glob');

function requireUncached(module) {
  delete require.cache[require.resolve(module)];
  return require(module);
}

function getMainPath() {
  const cwd = process.cwd();
  return path.join(cwd, '/.storybook/main.js');
}

function getGlobs() {
  // we need to invalidate the cache because otherwise the latest changes don't get loaded
  const { stories: storyGlobs } = requireUncached(getMainPath());

  return storyGlobs;
}

function getAddons() {
  const { addons } = requireUncached(getMainPath());

  return addons;
}

function getPaths() {
  return getGlobs().reduce((acc, storyGlob) => {
    const paths = glob.sync(storyGlob);
    return [...acc, ...paths];
  }, []);
}

function writeRequires() {
  const cwd = process.cwd();

  const storyPaths = getPaths();
  const addons = getAddons();
  // eslint-disable-next-line no-console
  console.log(`writing to storybook requires\n\n`, storyPaths);
  fs.writeFileSync(path.join(cwd, '/storybook.requires.js'), '');

  const path_array_str = `[${storyPaths.map((storyPath) => `require("${storyPath}")`).join(', ')}]`;

  const registerAddons = addons.map((addon) => `import "${addon}/register";`).join('\n');

  const fileContent = `
/*
  do not change this file, it is auto generated by storybook. 
*/
import { configure } from '@storybook/react-native';
${registerAddons}

const getStories=() => {
  return ${path_array_str};
}
configure(getStories, module, false)

  `;

  fs.writeFileSync(path.join(cwd, '/storybook.requires.js'), fileContent, {
    encoding: 'utf8',
    flag: 'w',
  });
}

module.exports = {
  writeRequires,
  getGlobs,
  getMainPath,
};
