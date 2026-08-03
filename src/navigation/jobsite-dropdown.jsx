import { useEffect, useEffectEvent, useState } from "react";
import { Tab } from "react-bootstrap";
import Tabs from "react-bootstrap/Tabs";
import { useIsAuthenticated } from "@azure/msal-react";
import { authService } from "@/auth/authService.js";
import pathManager from "@/services/pathmanager.js";
import Accordion from "react-bootstrap/Accordion";
import folderIds from "@/FolderIds/job-folder-ids.json" with { type: "json" };

/**
 * JobsiteDropdown
 * ---------------
 * Finds job folders the signed-in user can access, including folders shared
 * directly with the user. Parent folders do not need to be accessible.
 */
export default function JobsiteDropdown() {
  const isAuthenticated = useIsAuthenticated();

  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortedYears, setSortedYears] = useState([]);
  const [groupedFolders, setGroupedFolders] = useState({});

  const [yearFolders, setYearFolders] = useState([]);

  const [openYear, setOpenYear] = useState("");
  const [searchForJobsites, setSearchForJobsites] = useState(false);

  useEffect(() => {   
    if (isAuthenticated) {
      loadFolders();
    }

  }, [isAuthenticated]);

  useEffect(()=>{
    async function reloadJobsites(){
        pathManager.jobsList = [];
        await loadFolders();
      }
    window.addEventListener("reloadJobsites", reloadJobsites);
    return() => {
      window.removeEventListener("reloadJobsites", reloadJobsites);
    };
  }, []);
async function loadFolders() {
    setLoading(true);
    setError(null);

      try{
        let jobs = pathManager.jobsList;
        if (!jobs || jobs.length === 0) {
          jobs = await searchJobsites();
          pathManager.jobsList = jobs;
        }
        const grouped = Map.groupBy(jobs, job => job.year);
        const years = [...grouped.keys()].sort((a, b) => Number(b) - Number(a));
        setGroupedFolders(grouped);
        setSortedYears(years);
        setFolders(jobs);
        setOpenYear(years[0] ?? "");
    }
    catch (error)
    {
      console.error(error);
      }
    finally {
       setLoading(false);
    }
  }
    async function searchJobsites()
  {
    
    try {
      const jobs = folderIds.years.flatMap(year => 
        year.jobs.map(job => ({
          year: year.year,
          id: job.id,
          name: job.name,
          permissions: job.permissions.flatMap(permission =>
            permission.identities.map(identity => ({
              id: identity.id,
              name: identity.displayName,
              role: permission.roles[0],
            }))
          ),
        }))
      );
      
      
      let filteredFolders;
    
      console.log("Jobs retrieved: ", jobs);
      const account = await authService.getAccount();
      console.log(account.name);

      if (account.name === "John Thompson" || account.name === "Ryan Thompson"){
        return jobs;
      }
      
      const accountId = await account?.homeAccountId.split(".")[0];
      return jobs
      .filter(job =>
        job.permissions.some(permission =>
          permission.id === accountId
        )
      )
      .map(job => ({
        id: job.id,
        driveId: job.driveId,
        name: job.name.substring(5),
        year: job.year,
      }));
      
      } catch (err) {
      console.error(err);
      setError(err.message);
    } 
    }

  function handleSelect(folderKey) {
    const folder = folders.find(
      (item) => `${item.driveId}:${item.id}` === folderKey
    );
    if (!folder) return;

    console.log("Folder ID: "+ folder.id);
    setSelectedFolder(folderKey);
    pathManager.clearFolderHistory();
    pathManager.folderId = folder.id;
    pathManager.folderName = folder.name;

    // Navigate from the shared folder itself. This does not traverse Jobs or
    // "<year> Jobs", which recipients might not have permission to access.
    const childrenUrl =
      `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(folder.driveId)}` +
      `/items/${encodeURIComponent(folder.id)}/children`;
      console.log("URl : " + childrenUrl);
    pathManager.Path = childrenUrl;

    window.dispatchEvent(
      new CustomEvent("pathChanged", { })
    );
    window.dispatchEvent(new CustomEvent("showFolder", {}));
     window.dispatchEvent(new CustomEvent("setFolderName", {detail: folder.name}));
     window.dispatchEvent(new CustomEvent("setPathName", {detail: folder.name}));
  }

  if (!isAuthenticated) {
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
      <Accordion
        activeKey={openYear}
        onSelect={(key) => setOpenYear(key ?? "")}
      >
        {sortedYears.map((year) => (
          <Accordion.Item eventKey={year} key={year}>
            <Accordion.Header>{year}</Accordion.Header>
            <Accordion.Body>
              <Tabs

                id={`jobsite-tabs-${year}`}
                className="jobsite-tabs"
                activeKey={selectedFolder}// Controls which tab is highlighted
                onSelect={(value) => handleSelect(value)}// Fires whenever user clicks a tab
              >
                {/* Generate tabs dynamically from Graph folders.
                    Tabs only drive the date/image selection, so the tab body is
                    intentionally empty to keep the card layout clean. */}
               {(groupedFolders.get(year) || []).map((folder) => (
                <Tab
                  key={`${folder.driveId}:${folder.id}`}
                  eventKey={`${folder.driveId}:${folder.id}`}
                  title={folder.name}
                />
              ))}
              </Tabs>
            </Accordion.Body>
          </Accordion.Item>
        ))}
      </Accordion>
    </div>

  );
}
