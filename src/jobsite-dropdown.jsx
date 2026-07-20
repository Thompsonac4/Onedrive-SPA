import { useEffect, useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { useIsAuthenticated } from "@azure/msal-react";
import { authService } from "./authService.js";
import pathManager from "./pathmanager.js";
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

/**
 * JobsiteDropdown
 * ---------------
 * Second step in the hierarchy. Waits for a year to be selected, then lists
 * the jobsite folders inside Projects/<year> and lets the user pick one.
 *
 * Flow:
 *   YearDropdown → "yearChanged" → load jobsites here → pick jobsite →
 *   "pathChanged" → SubfolderTabs → DateDropdown → ImageContainer
 *
 * Authentication and the sign-in button now live in LoginButton (top right).
 */
export default function JobsiteDropdown() {
  const isAuthenticated = useIsAuthenticated();

  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("Select Jobsite");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasYear, setHasYear] = useState(Boolean(pathManager.yearPath));

  // Reload jobsites whenever the selected year changes
  useEffect(() => {
    async function onYearChanged() {
      if (!pathManager.yearPath) {
        setHasYear(false);
        setFolders([]);
        return;
      }
      setHasYear(true);
      setSelectedFolder("Select Jobsite");
      await loadFolders();
    }

    // Load immediately in case a year was already chosen
    onYearChanged();

    window.addEventListener("yearChanged", onYearChanged);
    return () => window.removeEventListener("yearChanged", onYearChanged);
  }, []);

  async function loadFolders() {
    setLoading(true);
    setError(null);
    try {
      const accessToken = await authService.getAccessToken();
      if (!accessToken) return;

      const response = await fetch(pathManager.yearPath, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error(`Graph returned ${response.status}`);
      }

      const data = await response.json();
      setFolders(
        (data.value || []).filter((item) => item.folder).map((item) => item.name)
      );
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(folder) {
    setSelectedFolder(folder);

    // Append the jobsite to the year path: Projects/<year>/<jobsite>
    const base = pathManager.yearPath.replace(":/children", "");
    const MainUrl = `${base}/${encodeURIComponent(folder)}:/children`;

    pathManager.Path = MainUrl;
    window.dispatchEvent(new CustomEvent("jobsiteImagesChanged"));
    window.dispatchEvent(new CustomEvent("pathChanged", { detail: MainUrl }));
    
  }

  // Hidden until signed in and a year is chosen
  if (!isAuthenticated || !hasYear) {
    return null;
  }
  if (loading) {
    return <div>Loading jobsites...</div>;
  }
  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="JobsiteDropdown">
      <Autocomplete
        disablePortal
        disableClearable
        options={folders}
        sx={{ width: 300 }}
        renderInput={(params) => <TextField {...params} label="Jobsite" />}
        onChange={(event, value) => handleSelect(value)}
      />
    </div>
  );
}
