import React, { useState } from "react";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";

const apiKeyIsValid = (apiKey: string) => {
  console.error("api key is invalid");
  console.log(apiKey.length === 36);
  return apiKey.length === 36;
};
// todo type handleClick properly
export const ApiKeyForm = ({ saveApiKey }: { saveApiKey: any }) => {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showError, setShowError] = useState(false);
  const handleChange = (event: any) => {
    setApiKeyInput(event.target.value.trim());
    if (apiKeyIsValid(apiKeyInput)) {
      setShowError(false);
    }
  };

  const handleClick = () => {
    if (!apiKeyIsValid(apiKeyInput)) {
      setShowError(true);
    } else {
      saveApiKey(apiKeyInput);
    }
  };

  return (
    <form>
      <TextField
        helperText={showError && "Invalid api key"}
        error={showError}
        id="apikey"
        label="Enter your api key"
        onChange={handleChange}
        value={apiKeyInput}
      />
      <Button onClick={handleClick}>Save</Button>
    </form>
  );
};
