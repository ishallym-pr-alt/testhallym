declare global {
  var lastUpdateVersion: number;
}

if (!global.lastUpdateVersion) {
  global.lastUpdateVersion = Date.now();
}

export const getVersion = () => global.lastUpdateVersion;
export const updateVersion = () => {
  global.lastUpdateVersion = Date.now();
  return global.lastUpdateVersion;
};
