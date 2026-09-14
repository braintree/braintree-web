import constants from "../../../lib/constants";

const buildClientSdkMetadata = ({
  platform,
  source,
  integration,
  sessionId,
}) => ({
  platform,
  source,
  integration,
  sessionId,
  version: constants.VERSION,
});

export { buildClientSdkMetadata };

export default {
  buildClientSdkMetadata,
};
