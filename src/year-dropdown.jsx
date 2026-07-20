import { useEffect, useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { useIsAuthenticated } from "@azure/msal-react";
import { authService } from "./authService.js";
import { graphConfig } from "./msal-config.jsx";
import pathManager from "./pathmanager.js";

// Top-level folder that contains the year subfolders (Projects/<year>/...)
const FOLDER_ID = graphConfig.jobsitesFolderId;
let defaultYear = false;
/**
 * YearDropdown
 * ------------
 * First step in the selection hierarchy (after login).
 * Lists the year folders under the configured Projects folder, and when a
 * year is picked it stores the year path and fires "yearChanged" so the
 * JobsiteDropdown can load jobsites for that year.
 */
export default function YearDropdown() {
  const isAuthenticated = useIsAuthenticated();
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("Select Year");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load years once the user is authenticated (app reloads after redirect login)
  useEffect(() => {
    if (isAuthenticated) {
      loadYears();
    }
  }, [isAuthenticated]);

  async function loadYears() {
    setLoading(true);
    setError(null);
    try {
      const accessToken = await authService.getAccessToken();
      if (!accessToken) return;

      const url = `https://graph.microsoft.com/v1.0/drives/${graphConfig.driveId}/items/${FOLDER_ID}/children`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error(`Graph returned ${response.status}`);
      }

      const data = await response.json();
      
      const yearList = data.value.filter((item) => item.folder).map((item) => item.name);
      setYears(yearList);

      if (yearList.length > 0 && !defaultYear) {
        defaultYear = true;
        handleSelect(yearList[0]);   // Sets selectedYear and updates pathManager
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(year) {
    setSelectedYear(year);

    // Build the children URL of Projects/<year> and let JobsiteDropdown use it
    const base = `https://graph.microsoft.com/v1.0/drives/${graphConfig.driveId}/items/${FOLDER_ID}`;
    pathManager.yearPath = `${base}:/${encodeURIComponent(year)}:/children`;

    window.dispatchEvent(
      new CustomEvent("yearChanged", { detail: pathManager.yearPath })
    );
  }

  if (!isAuthenticated) {
    return null;
  }
  if (loading) {
    return <div>Loading years...</div>;
  }
  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="YearDropdown">
      <Dropdown>
        <Dropdown.Toggle variant="success" id="year-dropdown">
          {selectedYear}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {years.length === 0 ? (
            <Dropdown.Item disabled>No years found</Dropdown.Item>
          ) : (
            years.map((year) => (
              <Dropdown.Item key={year} onClick={() => handleSelect(year)}>
                {year}
              </Dropdown.Item>
            ))
          )}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
}
