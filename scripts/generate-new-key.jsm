/*
 * Generates a new GUID and prints it to the console.
 * If --env flag is passed, it will also export the value to the environment.
 */

function generateGuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const guid = generateGuid();

// is there a --env flag?

// export to the environment
const command = `export MBCVT_PUBLIC_KEY=${guid}`;
console.log(command);

if (arguments.length > 0 && arguments[0] === "--env") {
  // now actually run the export command
  const { execSync } = require("child_process");
  execSync(command, { stdio: "inherit" });

  console.log(`Public key set to ${guid}`);
}
