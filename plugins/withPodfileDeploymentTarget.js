const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withPodfileDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const file = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (fs.existsSync(file)) {
        let contents = fs.readFileSync(file, 'utf8');
        
        const snippet = `post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '16.4'
    end
  end
`;
        
        if (!contents.includes("installer.pods_project.targets.each do |target|")) {
          contents = contents.replace(/post_install do \|installer\|/g, snippet);
          fs.writeFileSync(file, contents);
        }
      }
      return config;
    },
  ]);
};
