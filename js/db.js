/*
const ADODB = require('node-adodb');
console.log('node-adodb successfully loaded.');
const path = require('path');


const dbPath = path.join(__dirname, '../Database.accdb');

// Define the database connection string
const connection = ADODB.open('Provider=Microsoft.ACE.OLEDB.12.0;Data Source=' + dbPath, process.arch.includes('64'));
*/


const ADODB = require('node-adodb');
const path = require('path');
const fs = require('fs');

// Read configuration from config.json
const configPath = path.join(__dirname, '..', 'config.json');
let config = {};
try {
  const configContent = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(configContent);
} catch (error) {
  console.error('Error reading config.json:', error);
  // Fallback: use a default database path if config cannot be read.
  config.databasePath = path.join(__dirname, '..', 'Database.accdb');
}

// Use the database path from the config file
const dbPath = config.databasePath;
console.log('Using database path:', dbPath);

// Define the connection string.
// The second parameter (a boolean) indicates whether the process is running in 64-bit mode.
const connection = ADODB.open(
  'Provider=Microsoft.ACE.OLEDB.12.0;Data Source=' + dbPath,
  process.arch.includes('64')
);

console.log('ADODB connection established.');

/**
 * Retrieves data for app user
 * CRUD operation SELECT from db.
 *
 * @param {string} userCode - The user name.
 * @returns {string} username and role.
 */
async function getUserData(userCode) {
  try {
    const query = `SELECT username, role FROM users WHERE username='${userCode}'`;
    const result = await connection.query(query);
    return result.length > 0 ? result[0] : null; // Return the first matching user or null
  } catch (error) {
    console.error('Error fetching user data for userCode:', userCode, error);
    throw new Error('Error fetching user data for userCode ' + userCode + ': ' + error.message);
  }
};


/**
 * Converts a date string from "yyyy-mm-dd" to "mm/dd/yyyy"
 * for use in MS Access queries.
 *
 * @param {string} inputDate - The date string in "yyyy-mm-dd" format.
 * @returns {string} The formatted date string in "mm/dd/yyyy" format.
 */
function formatDateForAccess(inputDate) {
  if (!inputDate) return '';

  // If inputDate is a Date object, convert it to yyyy-mm-dd first
  let dateString;
  if (typeof inputDate === 'object' && inputDate instanceof Date) {
    const year = inputDate.getFullYear();
    const month = String(inputDate.getMonth() + 1).padStart(2, '0');
    const day = String(inputDate.getDate()).padStart(2, '0');
    dateString = `${year}-${month}-${day}`;
  } else if (typeof inputDate === 'string') {
    dateString = inputDate;
  } else {
    dateString = String(inputDate);
  }

  const parts = dateString.split('-');
  if (parts.length !== 3) {
    console.error('Invalid date format. Expected yyyy-mm-dd:', dateString);
    return dateString; // or throw an error
  }
  const [year, month, day] = parts;
  return `${month}/${day}/${year}`;
}

// Helper to convert a DD/MM/YYYY date string to MS Access literal (#MM/DD/YYYY#)
function convertToAccessDate(dateStr) {
  // Expects dateStr in DD/MM/YYYY format.
  const [day, month, year] = dateStr.split('/');
  return `#${month}/${day}/${year}#`;
}

// Utility function to format dates
function formatDate(date) {
  return date.includes('-') ? date.split('-').reverse().join('/') : date;
}

// Utility function to format dates for MS Access (e.g. YYYY-MM-DD)
function formatDate(date) {
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

//-------------- VIEW_RESOURCES.HTML FUNCTIONS ---------------------

/**
 * Retrieve room data for view_resources.html"
 * for resource update.
 *
 * @param {string} inputDate - The date string in "yyyy-mm-dd" format.
 * @returns {array} room data
 */
async function getRoomsData(date) {
  try {
    // Query 1: Rooms joined with Resources.
    const roomsQuery = `
      SELECT r.*, rs.status
      FROM Rooms AS r
      LEFT JOIN Resources AS rs ON r.resource_id = rs.resource_id;
    `;
    const dbRooms = await connection.query(roomsQuery);

    // Query 2: Historical status from ResourceStatusHistory.
    const accessDate = date ? convertToAccessDate(date) : 'Date()';
    const historicalQuery = `
      SELECT temporal_status_id, resource_id, status_type AS historical_status, start_date, end_date
      FROM ResourceStatusHistory
      WHERE start_date <= ${date ? accessDate : 'Date()'}
      AND (end_date >= ${date ? accessDate : 'Date()'} OR end_date IS NULL);
    `;
    const historicalData = await connection.query(historicalQuery);

    // Build a lookup keyed by resource_id.
    const historicalLookup = {};
    historicalData.forEach((hist) => {
      historicalLookup[hist.resource_id] = hist;
    });

    // Query 3: Equipment names from Equipment (specific to rooms).
    const equipmentQuery = `
      SELECT re.room_id, e.equipment_name
      FROM Room_equipment AS re
      LEFT JOIN Equipment AS e ON re.resource_id = e.resource_id;
    `;
    const equipmentData = await connection.query(equipmentQuery);

    // Merge rooms with historical data.
    const result = {};
    dbRooms.forEach((room) => {
      const roomId = room.room_id;
      result[roomId] = {
        ...room,
        equipment_names: [],
        historical_status: null,
        temporal_status_id: null,
        start_date: null,
        end_date: null,
      };
      if (historicalLookup[room.resource_id]) {
        const hist = historicalLookup[room.resource_id];
        result[roomId].historical_status = hist.historical_status;
        result[roomId].temporal_status_id = hist.temporal_status_id;
        result[roomId].start_date = hist.start_date;
        result[roomId].end_date = hist.end_date;
      }
    });

    // Merge equipment names.
    equipmentData.forEach((eq) => {
      if (result[eq.room_id]) {
        result[eq.room_id].equipment_names.push(eq.equipment_name);
      }
    });

    // Convert equipment_names arrays to comma‐separated strings.
    const formattedRooms = Object.values(result).map((room) => {
      room.equipment_names = room.equipment_names.join(', ');
      return room;
    });

    return formattedRooms;
  } catch (error) {
    console.error('Error fetching rooms data for date:', date, error);
    throw new Error('Error fetching rooms data for date ' + date + ': ' + error.message);
  }
}

/**
 * Retrieve rtrainer data for view_resources.html"
 * for resource update.
 *
 * @param {string} inputDate - The date string in "yyyy-mm-dd" format.
 * @returns {array} room data
 */
async function getTrainersData(date) {
  try {
    const trainersQuery = `
      SELECT t.*, rs.status
      FROM Trainers AS t
      LEFT JOIN Resources AS rs ON t.resource_id = rs.resource_id;
    `;
    const trainers = await connection.query(trainersQuery);

    const accessDate = date ? convertToAccessDate(date) : 'Date()';
    const historicalQuery = `
      SELECT temporal_status_id, resource_id, status_type AS historical_status, start_date, end_date
      FROM ResourceStatusHistory
      WHERE start_date <= ${date ? accessDate : 'Date()'}
      AND (end_date >= ${date ? accessDate : 'Date()'} OR end_date IS NULL);
    `;
    const historicalData = await connection.query(historicalQuery);
    const historicalLookup = {};
    historicalData.forEach((hist) => {
      historicalLookup[hist.resource_id] = hist;
    });

    const result = trainers.map((trainer) => {
      const hist = historicalLookup[trainer.resource_id];
      return {
        ...trainer,
        historical_status: hist ? hist.historical_status : null,
        temporal_status_id: hist ? hist.temporal_status_id : null,
        start_date: hist ? hist.start_date : null,
        end_date: hist ? hist.end_date : null,
      };
    });
    return result;
  } catch (error) {
    console.error('Error fetching trainers data for date:', date, error);
    throw new Error('Error fetching trainers data for date ' + date + ': ' + error.message);
  }
}

/**
 * Retrieve vehicle data for view_resources.html"
 * for resource update.
 *
 * @param {string} inputDate - The date string in "yyyy-mm-dd" format.
 * @returns {array} room data
 */
async function getVehicleData(date) {
  try {
    const vehiclesQuery = `
      SELECT v.license & " " & v.brand & " " & v.model AS Name, 
             v.resource_id, v.veh_type, v.other_veh_type, v.year, v.purchase_year,
             v.VIN, v.fuel_type, v.admission_type, v.cylinders, 
             v.body_type, v.transmission, v.engine_model, v.engine_size, 
             v.systems, v.require_service, v.service_type, v.service_freq, rs.status
      FROM Vehicles AS v
      LEFT JOIN Resources AS rs ON v.resource_id = rs.resource_id;
    `;
    const vehicles = await connection.query(vehiclesQuery);

    const accessDate = date ? convertToAccessDate(date) : 'Date()';
    const historicalQuery = `
      SELECT temporal_status_id, resource_id, status_type AS historical_status, start_date, end_date
      FROM ResourceStatusHistory
      WHERE start_date <= ${date ? accessDate : 'Date()'}
      AND (end_date >= ${date ? accessDate : 'Date()'} OR end_date IS NULL);
    `;
    const historicalData = await connection.query(historicalQuery);
    const historicalLookup = {};
    historicalData.forEach((hist) => {
      historicalLookup[hist.resource_id] = hist;
    });

    const result = vehicles.map((vehicle) => {
      const hist = historicalLookup[vehicle.resource_id];
      return {
        ...vehicle,
        historical_status: hist ? hist.historical_status : null,
        temporal_status_id: hist ? hist.temporal_status_id : null,
        start_date: hist ? hist.start_date : null,
        end_date: hist ? hist.end_date : null,
      };
    });
    return result;
  } catch (error) {
    console.error('Error fetching vehicle data for date:', date, error);
    throw new Error('Error fetching vehicle data for date ' + date + ': ' + error.message);
  }
}

/**
 * Retrieve room equipment for view_resources.html"
 * for resource update.
 *
 * @param {string} inputDate - The date string in "yyyy-mm-dd" format.
 * @returns {array} room data
 */
async function getEquipmentData(date) {
  try {
    const equipmentQuery = `
      SELECT e.*, rs.status, rs.location
      FROM Equipment AS e
      LEFT JOIN Resources AS rs ON e.resource_id = rs.resource_id;
    `;
    const equipments = await connection.query(equipmentQuery);

    const accessDate = date ? convertToAccessDate(date) : 'Date()';
    const historicalQuery = `
      SELECT temporal_status_id, resource_id, status_type AS historical_status, start_date, end_date
      FROM ResourceStatusHistory
      WHERE start_date <= ${date ? accessDate : 'Date()'}
      AND (end_date >= ${date ? accessDate : 'Date()'} OR end_date IS NULL);
    `;
    const historicalData = await connection.query(historicalQuery);
    const historicalLookup = {};
    historicalData.forEach((hist) => {
      historicalLookup[hist.resource_id] = hist;
    });

    const result = equipments.map((equipment) => {
      const hist = historicalLookup[equipment.resource_id];
      return {
        ...equipment,
        historical_status: hist ? hist.historical_status : null,
        temporal_status_id: hist ? hist.temporal_status_id : null,
        start_date: hist ? hist.start_date : null,
        end_date: hist ? hist.end_date : null,
      };
    });
    return result;
  } catch (error) {
    console.error('Error fetching equipment data for date:', date, error);
    throw new Error('Error fetching equipment data for date ' + date + ': ' + error.message);
  }
}

/**
 * Retrieve multimedia data for view_resources.html"
 * for resource update.
 *
 * @param {string} inputDate - The date string in "yyyy-mm-dd" format.
 * @returns {array} room data
 */
async function getMultimediaData(date) {
  try {
    const multimediaQuery = `
      SELECT m.*, rs.status
      FROM Multimedia AS m
      LEFT JOIN Resources AS rs ON m.resource_id = rs.resource_id;
    `;
    const multimedia = await connection.query(multimediaQuery);

    const accessDate = date ? convertToAccessDate(date) : 'Date()';
    const historicalQuery = `
      SELECT temporal_status_id, resource_id, status_type AS historical_status, start_date, end_date
      FROM ResourceStatusHistory
      WHERE start_date <= ${date ? accessDate : 'Date()'}
      AND (end_date >= ${date ? accessDate : 'Date()'} OR end_date IS NULL);
    `;
    const historicalData = await connection.query(historicalQuery);
    const historicalLookup = {};
    historicalData.forEach((hist) => {
      historicalLookup[hist.resource_id] = hist;
    });

    const result = multimedia.map((media) => {
      const hist = historicalLookup[media.resource_id];
      return {
        ...media,
        historical_status: hist ? hist.historical_status : null,
        temporal_status_id: hist ? hist.temporal_status_id : null,
        start_date: hist ? hist.start_date : null,
        end_date: hist ? hist.end_date : null,
      };
    });
    return result;
  } catch (error) {
    console.error('Error fetching multimedia data for date:', date, error);
    throw new Error('Error fetching multimedia data for date ' + date + ': ' + error.message);
  }
}

/**
 * Retrieve workstation data for view_resources.html"
 * for resource update.
 *
 * @param {string} inputDate - The date string in "yyyy-mm-dd" format.
 * @returns {array} room data
 */
async function getWorkstationData(date) {
  try {
    const workstationQuery = `
      SELECT w.*, rs.status
      FROM Workstations AS w
      LEFT JOIN Resources AS rs ON w.resource_id = rs.resource_id;
    `;
    const workstations = await connection.query(workstationQuery);

    const accessDate = date ? convertToAccessDate(date) : 'Date()';
    const historicalQuery = `
      SELECT temporal_status_id, resource_id, status_type AS historical_status, start_date, end_date
      FROM ResourceStatusHistory
      WHERE start_date <= ${date ? accessDate : 'Date()'}
      AND (end_date >= ${date ? accessDate : 'Date()'} OR end_date IS NULL);
    `;
    const historicalData = await connection.query(historicalQuery);
    const historicalLookup = {};
    historicalData.forEach((hist) => {
      historicalLookup[hist.resource_id] = hist;
    });

    const result = workstations.map((workstation) => {
      const hist = historicalLookup[workstation.resource_id];
      return {
        ...workstation,
        historical_status: hist ? hist.historical_status : null,
        temporal_status_id: hist ? hist.temporal_status_id : null,
        start_date: hist ? hist.start_date : null,
        end_date: hist ? hist.end_date : null,
      };
    });
    return result;
  } catch (error) {
    console.error('Error fetching workstation data for date:', date, error);
    throw new Error('Error fetching workstation data for date ' + date + ': ' + error.message);
  }
}

//--------------  END VIEW_RESOURCES.HTML || HELPER FUNCTIONS--------------------

// ===== NEW_EVENT.HTML: CALLS TO DB FOR DATA RETRIEVAL AND CRUD OPPERATIONS =====

/**
 * Query db to retrieve training data:
 * 1. return training data to new_event.html.
 * 2. Populate search suggestion for training or event data.
 * 3. Training data is used to define event type".
 *
 * @param {none}
 */
async function getTrainingData() {

  try {

    const query = `
      SELECT * FROM Trainings`;

    const trainings = await connection.query(query);

    return trainings; // Return the trainers query
  } catch (error) {
    throw new Error('Error during database query: ' + error.message);
  }
};

/**
 * Query db to retrieve room data:
 * 1. return room data to new_event.html.
 * 2. transfer information to loadRoomData.
 * 3. room data is used to fill selection checkboxese".
 *
 * @param {none}
 */
async function getEventRoomData() {

  try {

    const query = `
      SELECT Rooms.* 
      FROM Rooms 
      INNER JOIN Resources ON Rooms.resource_id = Resources.resource_id 
      WHERE Resources.status = 'Active'`;

    const eventRoom = await connection.query(query);

    return eventRoom; // Return the trainers query
  } catch (error) {
    throw new Error('Error during database query: ' + error.message);
  }
};

/**
 * Query db to retrieve trainer data:
 * 1. return trainer data to new_event.html.
 * 2. transfer information to loadTrainerData.
 * 3. Trainer data is used to fill selection checkboxese".
 *
 * @param {none}
 */
async function getEventTrainerData() {

  try {

    const query = `
      SELECT Trainers.*
      FROM Trainers
      INNER JOIN Resources ON Trainers.resource_id = Resources.resource_id 
      WHERE Resources.status = 'Active'`;

    const eventTrainer = await connection.query(query);

    return eventTrainer; // Return the trainers query
  } catch (error) {
    throw new Error('Error during database query: ' + error.message);
  }
};

/**
 * Query db to retrieve vehicle data:
 * 1. return vehicle data to new_event.html.
 * 2. transfer information to loadVehicleData.
 * 3. vehicle data is used to fill selection checkboxese".
 *
 * @param {none}
 */
async function getEventVehicleData() {

  try {

    const query = `
      SELECT 
        license & " " & brand & " " & model AS Name, 
        Vehicles.resource_id 
      FROM Vehicles 
      INNER JOIN Resources ON Vehicles.resource_id = Resources.resource_id 
      WHERE Resources.status = 'Active'`;

    const eventVehicle = await connection.query(query);

    return eventVehicle; // Return the trainers query
  } catch (error) {
    throw new Error('Error during database query: ' + error.message);
  }
};

/**
 * Query db to retrieve equipment data:
 * 1. return equipment data to new_event.html.
 * 2. transfer information to loadEquipmentData.
 * 3. equipment data is used to fill selection checkboxese".
 *
 * @param {none}
 */
async function getEventEquipmentData() {

  try {

    const query = `
      SELECT Equipment.*
      FROM Equipment
      INNER JOIN Resources ON Equipment.resource_id = Resources.resource_id 
      WHERE Resources.status = 'Active'`;

    const eventEquipment = await connection.query(query);

    return eventEquipment // Return the trainers query
  } catch (error) {
    throw new Error('Error during database query: ' + error.message);
  }
};

/**
 * Query db to retrieve multimedia data:
 * 1. return multimedia data to new_event.html.
 * 2. transfer information to loadMultimediaData.
 * 3. Multimedia data is used to fill selection checkboxese".
 *
 * @param {none}
 */
async function getEventMultimediaData() {

  try {

    const query = `
      SELECT Multimedia.*
      FROM Multimedia
      INNER JOIN Resources ON Multimedia.resource_id = Resources.resource_id 
      WHERE Resources.status = 'Active'`;

    const eventMultimedia = await connection.query(query);

    return eventMultimedia; // Return the trainers query
  } catch (error) {
    throw new Error('Error during database query: ' + error.message);
  }
};

/**
 * Query db to retrieve workstation data:
 * 1. return workstation data to new_event.html.
 * 2. transfer information to loadWorkstationData.
 * 3. workstation data is used to fill selection checkboxese".
 *
 * @param {none}
 */
async function getEventWorkstationData() {

  try {

    const query = `
      SELECT Workstations.*
      FROM Workstations
      INNER JOIN Resources ON Workstations.resource_id = Resources.resource_id 
      WHERE Resources.status = 'Active'`;

    const eventWorkstation = await connection.query(query);

    return eventWorkstation // Return the trainers query
  } catch (error) {
    throw new Error('Error during database query: ' + error.message);
  }
};

/**
 * Query db to retrieve unavailable resource status data:
 * 1. return resource status to new_event.html.
 * 2. retrieve info from resourceSatusHistory.
 * 3. resource status will enable / disable  selection checkboxese".
 *
 * @param {start_date, end_date}
 */
async function getReservedResources(start_date, end_date) {
  try {
    // Validate input dates
    if (!start_date || !end_date) {
      throw new Error('Start date and end date are required');
    }

    // Format dates for MS Access
    const formatedStartDate = formatDateForAccess(start_date);
    const formatedEndDate = formatDateForAccess(end_date);

    const query = `
    SELECT resource_id
    FROM ResourceStatusHistory
    WHERE start_date <= #${formatedEndDate}#
    AND (end_date >= #${formatedStartDate}# OR end_date IS NULL)`;
    const reservedIds = await connection.query(query);
    return reservedIds;
  } catch (error) {
    throw new Error('Error during database query: ' + error.message);
  }
}

/**
 * create event into db:
 * 1. trigger checkResourcesRecursively to validate reource status.
 * 2. if status is free, triggers insert event .
 * 3. if event is created insert participant requirement.
 * 4. if event is created updates resource history
 * 5. if resource history is updated creates event resources
 * 6. if all ok, creates event message 
 *
 * @param {none}
 */
async function createEvent(eventData, user) {
  const {
    eventName,
    eventNameOther,
    eventType,
    eventTypeOther,
    eventStartDate,
    eventEndDate,
    selectedResources,
    eventStatus,
    eventConfirmationDays,
    min_part
  } = eventData;
  const appUser = user;

  try {
    // 1. Check for blocked resources.
    const blockedResources = await checkResourcesRecursively(selectedResources, eventStartDate, eventEndDate);
    if (blockedResources.length > 0) {
      // Return a generic message for the UI.
      return { success: false, message: `One or more resources (${blockedResources.map(resource => resource.name).join(', ')})are blocked for the selected dates.` };
    }

    // 2. Insert the event.
    const eventId = await insertEvent(eventData);
    if (!eventId) {
      return { success: false, message: "Failed to insert event." };
    }

    // 3. Insert the participants.
    if (eventType === "Training P" || eventType === "Training I") {
      const participants = await insertParticipants(eventId, min_part);
      if (!participants) {
        return { success: false, message: "Failed to insert participants." };
      }
    }
    console.log('test', selectedResources);
    // 3. Update resource status history.
    const createRSH = await createResourceStatusHistory(eventData, selectedResources, appUser);

    if (!createRSH) {
      await deleteEvent(eventId);
      return { success: false, message: "Failed to update resource status history. Event rolled back." };
    }

    // 4. Create event–resource associations.
    const eventResources = await createEventResources(eventData, eventId, selectedResources, appUser);
    if (!eventResources) {
      await rollbackDeleteResourceStatusHistory(selectedResources, eventStartDate, eventEndDate);
      await deleteEvent(eventId);
      return { success: false, message: "Failed to create event resources. Event rolled back." };
    }

    const eventMess = `
      INSERT INTO Messages (message_type, message_cont, message_status)
      VALUES ('message', 'A new event: Event(${eventId}) ${eventData.eventName} has been created', 'not read')
    `;
    await connection.execute(eventMess);
    return { success: true, eventId };
  } catch (error) {
    // Log detailed errors to the console only.
    console.log("Error in createEvent:", error);
    return { success: false, message: "An unexpected error occurred. Please try again." };
  }
}

// --- CREATE EVENT HELPER FUNCTIONS ---

// HELPER FUNCTION
// Check resources recursively for conflicts
async function checkResourcesRecursively(selectedResources, eventStartDate, eventEndDate) {
  const blockedResources = [];

  for (const resourceType in selectedResources) {
    const resources = selectedResources[resourceType];
    for (const resource of resources) {
      if (!resource || !resource.resource_id) continue;
      try {
        const status = await getResourceStatus(resource.resource_id);
        if (status === "Active") {

          const isBlocked = await checkResourceConflict(resource.resource_id, eventStartDate, eventEndDate);

          if (isBlocked) {
            blockedResources.push({ id: resource.resource_id, name: resource.resource_name, status });
          }
        } else if (status === "Inactive") {

        }
      } catch (error) {
        throw new Error(`Error checking resource ${resource.resource_id}:`, error);
      }
    }
  }
  return blockedResources;
}

//  HELPER FUNCTION
// Insert the event into the Events table and return the new event ID.
async function insertEvent(eventData) {
  const formattedStartDate = formatDateForAccess(eventData.eventStartDate);
  const formattedEndDate = formatDateForAccess(eventData.eventEndDate);
  const startDate = new Date(eventData.eventStartDate);
  const confirmationDate = new Date(startDate);
  confirmationDate.setDate(startDate.getDate() - eventData.eventConfirmationDays);
  const eventConfirmationDays = formatDateForAccess(confirmationDate);

  try {
    const insertQuery = `
      INSERT INTO Events 
        (event_name, event_name_other, event_type, event_type_other, event_start_date, event_end_date, event_status, event_confirmation_deadline)
      VALUES 
        ('${eventData.eventName}', '${eventData.eventNameOther}', '${eventData.eventType}', '${eventData.eventTypeOther}', #${formattedStartDate}#, #${formattedEndDate}#, '${eventData.eventStatus}', #${eventConfirmationDays}#)
    `;
    console.log('insertEvent ', insertQuery);
    await connection.execute(insertQuery);
    // Get the last inserted event ID.
    const lastIdQuery = await connection.query("SELECT MAX(event_id) AS LastID FROM Events");
    if (lastIdQuery.length > 0 && lastIdQuery[0].LastID) {
      return lastIdQuery[0].LastID;
    }
    return null;
  } catch (error) {
    console.log("Error inserting event:", error);
    return null;
  }
}

//  HELPER FUNCTION
// Update ResourceStatusHistory for each selected resource.
async function createResourceStatusHistory(eventData, selectedResources, appUser) {
  const formattedStartDate = formatDateForAccess(eventData.eventStartDate);
  const formattedEndDate = formatDateForAccess(eventData.eventEndDate);

  try {
    for (const resourceType in selectedResources) {
      const resources = selectedResources[resourceType];
      for (const resource of resources) {
        if (!resource || !resource.resource_id) {
          console.log("Invalid resource encountered.");
          return false;
        }
        const resourceId = parseInt(resource.resource_id, 10);
        const query = `
          INSERT INTO ResourceStatusHistory 
            (resource_id, status_type, start_date, end_date, details, created_by)
          VALUES 
            (${resourceId}, '${eventData.eventStatus}', #${formattedStartDate}#, #${formattedEndDate}#, '${eventData.eventName}', '${appUser}')
        `;
        console.log('createResourceStatusHistory ', query);
        await connection.execute(query);
      }
    }
    return true;
  } catch (error) {
    console.log("Error updating ResourceStatusHistory:", error);
    return false;
  }
}

//  HELPER FUNCTION
// Create entries in Event_resources linking the event with resources.
async function createEventResources(eventData, eventId, selectedResources, appUser) {
  try {
    for (const resourceType in selectedResources) {
      const resources = selectedResources[resourceType];
      for (const resource of resources) {
        if (!resource || !resource.resource_id) {
          console.log("Invalid resource encountered in createEventResources.");
          return false;
        }
        const resourceId = parseInt(resource.resource_id, 10);
        const query = `
          INSERT INTO Event_resources 
            (event_id, resource_id, assign_status, created_by)
          VALUES 
            (${eventId}, ${resourceId}, '${eventData.eventStatus}', '${appUser}')
        `;
        console.log('createEventResources ', query);
        await connection.execute(query);
      }
    }
    return true;
  } catch (error) {
    console.log("Error creating event resources:", error);
    return false;
  }
}

//  HELPER FUNCTION
// Add requiren number of participants and stores actual registrations for each event
async function insertParticipants(eventId, min_part) {
  try {
    const query = `INSERT INTO Participants (event_id, required_participants, inscribed_participants) VALUES (${eventId}, ${min_part}, 0)`;
    console.log('insertParticipants ', query);
    await connection.execute(query);
    return true;
  } catch (error) {
    console.log("Error creating event participants: ", error);
    return false;
  }
}

//  HELPER FUNCTION
// Retrieve the current status for a given resource.
async function getResourceStatus(resource_id) {
  const query = `SELECT status FROM Resources WHERE resource_id = ${resource_id}`;
  console.log('getResourceStatus ', query);
  try {
    const rows = await connection.query(query);
    return rows.length > 0 ? rows[0].status : null;
  } catch (error) {
    console.log(`Error retrieving status for resource ${resource_id}:`, error);
    throw new Error(`Error retrieving status for resource ${resource_id}:`, error);
  }
}

//  HELPER FUNCTION
// Check if the resource has a scheduling conflict.
async function checkResourceConflict(resource_id, eventStartDate, eventEndDate) {
  const formattedStartDate = formatDateForAccess(eventStartDate);
  const formattedEndDate = formatDateForAccess(eventEndDate);
  console.log(eventStartDate, eventEndDate, formattedStartDate, formattedEndDate);
  const query = `
    SELECT * FROM ResourceStatusHistory 
    WHERE resource_id = ${resource_id} 
      AND (start_date <= #${formattedEndDate}# AND end_date >= #${formattedStartDate}#)
  `;
  console.log('checkResourceConflict ', query);
  try {
    const rows = await connection.query(query);
    return rows.length > 0;
  } catch (error) {
    console.log(`Error checking conflict for resource ${resource_id}:`, error);
    throw new Error(`Error checking conflict for resource ${resource_id}:`, error);
  }
}

//  HELPER FUNCTION
// Delete an event (used for manual rollback).
async function deleteEvent(eventId) {
  try {
    const deleteQuery = `DELETE FROM Events WHERE event_id = ${eventId}`;
    console.log('deleteEvent ', query);
    await connection.execute(deleteQuery);
    return true;
  } catch (error) {
    console.log(`Error deleting event ${eventId}:`, error);
    return false;
  }
}

//  HELPER FUNCTION
// Delete ResourceStatusHistory entries (used for manual rollback).
async function rollbackDeleteResourceStatusHistory(selectedResources, eventStartDate, eventEndDate) {
  const formattedStartDate = formatDateForAccess(eventStartDate);
  const formattedEndDate = formatDateForAccess(eventEndDate);

  try {
    for (const resourceType in selectedResources) {
      const resources = selectedResources[resourceType];
      for (const resource of resources) {
        if (!resource || !resource.resource_id) {
          console.log("Invalid resource encountered in deleteResourceStatusHistory.");
          continue;
        }
        const resourceId = parseInt(resource.resource_id, 10);
        const query = `
          DELETE FROM ResourceStatusHistory 
          WHERE resource_id = ${resourceId} 
            AND status_type = "Reserved" 
            AND start_date = #${formattedStartDate}# 
            AND end_date = #${formattedEndDate}#
        `;
        console.log('deleteResourceStatusHistory ', query);
        await connection.execute(query);
      }
    }
    return true;
  } catch (error) {
    console.log("Error deleting ResourceStatusHistory:", error);
    return false;
  }
}

// --- END OF HELPER FUNCTIONS TO CREATE EVENT -------

// ===== VIEW_EVENT.HTML: CALLS TO DB FOR DATA RETRIEVAL AND CRUD OPPERATIONS =====

/**
 * Query db to retrieve events data:
 * 1. return events data to view_event.html.
 * 2. Populate grid and details for  event data.
 * 3. event data is used for visual aid on area ocupation.
 *
 * @param {none}
 */
async function getEventsData(startDate, endDate) {

  const eventStartDate = formatDateForAccess(startDate);
  const eventEndDate = formatDateForAccess(endDate);

  const query = `
  SELECT 
  e.event_id,
  e.event_name,
  e.event_name_other,
  e.event_type,
  e.event_type_other,
  e.event_start_date,
  e.event_end_date,
  e.event_status,
  r.resource_name,
  r.resource_category_id,
  er.assign_status,
  p.required_participants,
  p.inscribed_participants
FROM 
  (
    (Events AS e 
      LEFT JOIN Event_resources AS er 
        ON e.event_id = er.event_id)
    LEFT JOIN Resources AS r 
      ON er.resource_id = r.resource_id
  )
  LEFT JOIN Participants AS p
    ON e.event_id = p.event_id
WHERE 
  e.event_start_date >= #${eventStartDate}# 
  AND e.event_end_date <= #${eventEndDate}#
ORDER BY 
  e.event_start_date, e.event_name;
  `;
  try {
    const rows = await connection.query(query);
    // Transform rows into a structured format for each event.
    const events = rows.reduce((acc, row) => {
      const event = acc.find(e => e.event_id === row.event_id);
      if (event) {
        // If the event already exists, add the resource details.
        event.resources.push({
          resource_name: row.resource_name,
          resource_category_id: row.resource_category_id,
          assign_status: row.assign_status
        });
      } else {
        // Create a new event entry.
        acc.push({
          event_id: row.event_id,
          event_name: row.event_name,
          event_name_other: row.event_name_other,
          event_type: row.event_type,
          event_type_other: row.event_type_other,
          event_start_date: row.event_start_date,
          event_end_date: row.event_end_date,
          event_status: row.event_status,
          event_req_part: row.required_participants,
          event_insc_part: row.inscribed_participants,
          resources: [{
            resource_name: row.resource_name,
            resource_category_id: row.resource_category_id,
            assign_status: row.assign_status
          }]
        });
      }
      return acc;
    }, []);
    return events;
  } catch (error) {
    console.error("Error getting events data:", error);
    throw error;
  }
}

// --- END OF HELPER FUNCTIONS TO VIEW EVENT -------

// ===== UPDATE_EVENT.HTML: CALLS TO DB FOR DATA RETRIEVAL AND CRUD OPPERATIONS =====

/**
 * Query db to retrieve events data:
 * 1. return events data to update_event.html.
 * 2. Populate search container and details for event data.
 * 3. event data is used as reference to trigger data upload on update_event.
 *
 * @param {none} input
 * @param {event data} output
 */
async function getUpdateEventData() {
  const query = `SELECT * FROM Events WHERE event_status <> "Executed"`;

  try {
    const updateEvent = await connection.query(query);

    return updateEvent; // Return the trainers query
  } catch (error) {
    throw new Error('Error during database query: ' + error.message);
  }
}

/**
 * Query db to retrieve event resources data:
 * 1. return events resources data to update_event.html.
 * 2. Populate resources checkboxes for event.
 * 3. .
 *
 * @param {number} eventId
 * @param {Promise<Object>} resources 
 */
async function getEventResources(eventId) {
  const query = `SELECT resource_id FROM Event_resources WHERE event_id = ${eventId}`;
  try {
    const rows = await connection.query(query);
    return rows;
  } catch (error) {
    console.error(`Error retrieving event resource for event ${eventId}:`, error);
    throw error;
  }
}


/**
 * Confirm an event by updating its status in multiple tables.
 *
 * @param {number} eventId - 
 * @returns {Promise<Object>} 
 */
async function confirmEvent(eventId) {
  try {
    // Update the event status in the Events table.
    await updateEventStatus(eventId);

    // Update event resources status.
    await updateEventResources(eventId);

    // Update resource status history.
    await updateResourceStatusHistory(eventId);

    // Log a message in the Messages table.
    const messageQuery = `
      INSERT INTO Messages (message_type, message_cont, message_status)
      VALUES ('information', 'Event ID: (${eventId}) has been updated', 'not read')
    `;
    await connection.execute(messageQuery);

    return { success: true, message: `Event ${eventId} has been updated successfully.` };
  } catch (error) {
    console.log(`Error updating event ${eventId}:`, error);
    throw new Error('Error during database update: ' + error.message);
  }
}

/**
 * Update event status on the Events table.
 *
 * @param {number} eventId 
 * @returns {Promise<boolean>}
 */
async function updateEventStatus(eventId) {
  try {
    const query = `UPDATE Events SET event_status = 'Confirmed' WHERE event_id = ${eventId}`;
    await connection.execute(query);
    return true;
  } catch (error) {
    console.log(`Error updating event status for event ${eventId}:`, error);
    throw new Error('Error during Events table update: ' + error.message);
  }
}

/**
 * Update event resource status on the Event_resources table.
 *
 * @param {number} eventId 
 * @returns {Promise<boolean>}
 */
async function updateEventResources(eventId) {
  try {
    const query = `UPDATE Event_resources SET assign_status = 'Confirmed' WHERE event_id = ${eventId}`;
    await connection.execute(query);
    return true;
  } catch (error) {
    console.log(`Error updating event resources for event ${eventId}:`, error);
    throw new Error('Error during Event_resources table update: ' + error.message);
  }
}

/**
 * Update resource status history on the ResourceStatusHistory table.
 *
 * @param {number} eventId 
 * @returns {Promise<boolean>}
 */
async function updateResourceStatusHistory(eventId) {
  try {
    const query = `
      UPDATE ResourceStatusHistory 
      INNER JOIN (Events INNER JOIN Event_resources ON Events.event_id = Event_resources.event_id)
      ON (ResourceStatusHistory.resource_id = Event_resources.resource_id)
      AND (ResourceStatusHistory.start_date = Events.event_start_date)
      AND (ResourceStatusHistory.end_date = Events.event_end_date)
      SET ResourceStatusHistory.status_type = 'Confirmed'
      WHERE Events.event_id = ${eventId};
    `;
    await connection.execute(query);
    return true;
  } catch (error) {
    console.log(`Error updating resource status history for event ${eventId}:`, error);
    throw new Error('Error during ResourceStatusHistory update: ' + error.message);
  }
}


/**
 * Cancel event into db:
 * 1. delete record from Events.
 * 2. Delete resources status .
 * 3. Delete event resources.
 * 4. 
 *
 * @param {number} eventId
 * @param {Promise<object>} 
 */
async function cancelEvent(eventId) {

  try {
    // Delete resource status history
    await deleteResourceStatusHistory(eventId);

    // Delete event resources
    await deleteEventResources(eventId);

    //delete Event registry
    await deleteEventRecord(eventId);

    const messageQuery = `
    INSERT INTO Messages (message_type, message_cont, message_status)
    VALUES ('information', 'Event ID: (${eventId}) has been deleted', 'not read')
  `;
    await connection.execute(messageQuery);

    return { success: true, message: `Event ${eventId} has been deleted successfully.` };
  } catch (error) {
    console.log(`Error updating event ${eventId}:`, error);
    throw new Error('Error during database update: ' + error.message);
  }
}

/**
 * Delete event record from db:
 * 1. Delete event from Events table.
 * 2. .
 * 4. 
 *
 * @param {number} eventId
 * @param {Promise<boolean>}
 */
async function deleteEventRecord(eventId) {
  try {// Update the event status in the Events table
    const query = `DELETE FROM Events WHERE event_id = ${eventId}`;
    await connection.execute(query);
    return true;
  } catch (error) {
    console.log(`Error deleting event ${eventId}:`, error);
    throw new Error('Error during Events table delete' + error.message);
  }
}

/**
 * Delete event resource record from  db:
 * 1. Uodate event resource status from reserved to confirmed.
 * 2. .
 * 4. 
 *
 * @param {number} eventId@param {Promise<boolean>}
 */
async function deleteEventResources(eventId) {
  try {// Update the event status in the Events table
    const query = `DELETE FROM Event_resources WHERE event_id = ${eventId}`;
    await connection.execute(query);
    return true;
  } catch (error) {
    console.log(`Error updating event ${eventId}:`, error);
    throw new Error('Error during Events resources table update' + error.message);
  }
}

/**
 * Delete resource status history on db:
 * 1. Delete resource status history.
 * 2. 
 *
 * @param {number} eventId
 * @param {Promise<boolean>}
 */
async function deleteResourceStatusHistory(eventId) {
  try {// Update the event status in the Events table
    const query = `DELETE ResourceStatusHistory.*
      FROM ResourceStatusHistory 
      INNER JOIN ((Events INNER JOIN Event_resources ON Events.event_id = Event_resources.event_id))
      ON (ResourceStatusHistory.resource_id = Event_resources.resource_id) 
      AND (ResourceStatusHistory.start_date = Events.event_start_date)
      AND (ResourceStatusHistory.end_date = Events.event_end_date)
      WHERE Events.event_id = ${eventId};`;

    await connection.execute(query);
    return true;
  } catch (error) {
    console.log(`Error updating event ${eventId}:`, error);
    throw new Error('Error during Events resources table update' + error.message);
  }
}

/**
* Update partcipant on db:
* 1. Update participants.
* 2. 
*
* @param {numbers} participants,  eventId
* @param {Promise<boolean>}
*/
async function updateParticipants(participants, eventId) {
  try {
    // call to update table
    await updatePartTable(participants, eventId);

    const messageQuery = `
    INSERT INTO Messages (message_type, message_cont, message_status)
    VALUES ('information', 'Participants for Event ID: (${eventId}) has been updated', 'not read')
  `;
    await connection.execute(messageQuery);

    return { success: true, message: `Participants for event ${eventId} has been updated successfully.` };
  } catch (error) {
    console.log(`Error updating participants for event ${eventId}:`, error);
    throw new Error('Error during Participants table update: ' + error.message);
  }
}

/**
 * Update partcipant registry on db:
 * 1. Update participants table.
 * 2. 
 *
 * @param {numbers} participants,  eventId
 * @param {Promise<boolean>}
 */
async function updatePartTable(participants, eventId) {
  try {
    const query = `UPDATE Participants SET inscribed_participants = ${participants} WHERE event_id = ${eventId}`;
    await connection.execute(query);

    return true;
  } catch (error) {
    console.log(`Error updating participants for event ${eventId}:`, error);
    throw new Error('Error during Participants table update: ' + error.message);
  }
}

/**
 * Close event into db:
 * 1. Change status record from Events.
 * 2. update Participants status .
 * 3.
 * 4. 
 *
 * @param {number, number} eventId, participants
 * @param {Promise<object>} 
 */
async function endEvent(participants, eventId) {

  try {
    // Delete resource status history
    await eventExecuted(eventId);

    // Delete event resources
    await finalPartTableUpdate(participants, eventId);

    const messageQuery = `
    INSERT INTO Messages (message_type, message_cont, message_status)
    VALUES ('Information', 'Event ID: (${eventId}) has been closed', 'not read')
  `;
    await connection.execute(messageQuery);

    return { success: true, message: `Event ${eventId} has been closed successfully.` };
  } catch (error) {
    console.log(`Error updating event ${eventId}:`, error);
    throw new Error('Error during database update: ' + error.message);
  }
}

/**
* Update event status on the Events table.
*
*  @param {number} eventId
* @param {Promise<object>} 
*/
async function eventExecuted(eventId) {
  try {
    const query = `UPDATE Events SET event_status = 'Executed' WHERE event_id = ${eventId}`;
    await connection.execute(query);
    return true;
  } catch (error) {
    console.log(`Error updating event close status for event ${eventId}:`, error);
    throw new Error('Error during Events table update: ' + error.message);
  }
}

/**
 * Update total partcipant registry on db:
 * 1. Update participants table.
 * 2. 
 * @param {number, number} eventId participants
 * @param {Promise<object>} 
 */
async function finalPartTableUpdate(participants, eventId) {
  try {
    const query = `UPDATE Participants SET total_part = ${participants} WHERE event_id = ${eventId}`;
    await connection.execute(query);

    return true;
  } catch (error) {
    console.log(`Error updating total participants for event ${eventId}:`, error);
    throw new Error('Error during Participants table update: ' + error.message);
  }
}

/**
 * Replace resources on event update:
 * 1. Update resource status history table.
 * 2. Update event resources table
 * @param {number, date, date, array, array} eventId, start date, end date, to delete, to include
 * @param {Promise<object>} 
 */
async function replaceEventResources(targetEventId, targetEventName, updateStartDate, updateEndDate, toDeleteResourses, toIncludeResources) {

  const replaceStartDate = formatDateForAccess(updateStartDate);
  const replaceEndDate = formatDateForAccess(updateEndDate);

  try {
    // Delete resource from resourcestatus history
    await removeFromResourceStatusHistory(targetEventId, replaceStartDate, replaceEndDate, toDeleteResourses);

    // Delete resource from event resources
    await removeFromEventResources(targetEventId, toDeleteResourses);

    //include resource on resource status history
    await includeOnResourceStatusHistory(targetEventId, replaceStartDate, replaceEndDate, targetEventName, toIncludeResources);

    // Include resource on event resources
    await includeOnEventResources(targetEventId, toIncludeResources);

    const messageQuery = `
    INSERT INTO Messages (message_type, message_cont, message_status)
    VALUES ('information', 'Event ID: (${targetEventId}) has been updated', 'not read')
  `;
    await connection.execute(messageQuery);

    return { success: true, message: `${targetEventId}` };
  } catch (error) {
    console.log(`Error updating event ${targetEventId}:`, error);
    throw new Error('Error during database update: ' + error.message);
  }
}

/**
 * Remove resources on event update:
 * 1. Delete resource on resource status history table.
 * 2. Update event resources table
 * @param {date, date, array}  start date, end date, to delete
 * @param {Promise<object>} 
 */
async function removeFromResourceStatusHistory(eventId, startDate, endDate, resources) {

  if (!resources.length) return true;

  try {
    const query = `
    DELETE FROM ResourceStatusHistory
    WHERE resource_id IN (${resources})
      AND start_date = #${startDate}#
      AND end_date = #${endDate}#
  `;

    await connection.execute(query);
    return true;
  } catch (error) {
    console.log(`Error updating event ${eventId}:`, error);
    throw new Error('Error during resource status history table update' + error.message);
  }
}

/**
 * Remove resources on event update:
 * 1. Delete resource on resource status history table.
 * 2. Update event resources table
 * @param {number, date, date, array, array} eventId, to delete
 * @param {Promise<object>} 
 */
async function removeFromEventResources(eventId, resources) {

  if (!resources.length) return true;

  try {
    const query = `
    DELETE FROM Event_resources
    WHERE resource_id IN (${resources})
      AND event_id = ${eventId};
  `;

    await connection.execute(query);
    return true;
  } catch (error) {
    console.log(`Error updating event ${eventId}:`, error);
    throw new Error('Error during events resources table update' + error.message);
  }
}

/**
 * include resources on event update:
 * 1. include resource on event resources table.
 * 2. Update event resources table
 * @param {number, date, date, array, array} eventId, to delete
 * @param {Promise<object>} 
 */
async function includeOnResourceStatusHistory(eventId, startDate, endDate, eventName, include) {

  if (!include.length) return true;

  try {
    for (const resourceId of include) {
      // Build your query string. Make sure to properly sanitize eventName if it comes from user input.
      const query = `
        INSERT INTO ResourceStatusHistory (resource_id, status_type, start_date, end_date, details)
        VALUES (${resourceId}, 'Reserved', #${startDate}#, #${endDate}#,'${eventName}' )
      `;
      await connection.execute(query);
    }
    return true;
  } catch (error) {
    console.log(`Error updating event ${eventId}:`, error);
    throw new Error('Error during events resources table update' + error.message);
  }
}

/**
 * include resources on event update:
 * 1. include resource on event resources table.
 * 2. Update event resources table
 * @param {number, date, date, array, array} eventId, to delete
 * @param {Promise<object>} 
 */
async function includeOnEventResources(eventId, include) {

  const today = formatDateForAccess(new Date());

  if (!include.length) return true;

  try {
    for (const resourceId of include) {
      // Build your query string. Make sure to properly sanitize eventName if it comes from user input.
      const query = `
        INSERT INTO Event_resources (event_id, resource_id, assign_status, update_date)
        VALUES (${eventId}, ${resourceId}, 'Reserved', #${today}#)
      `;
      await connection.execute(query);
    }
    return true;
  } catch (error) {
    console.log(`Error updating event resources for event ${eventId}:`, error);
    throw new Error('Error during events resources table update' + error.message);
  }
}


// --- END OF HELPER FUNCTIONS TO UPDATE EVENT -------

//========== NEW_RESOURCES.HTML || RESOURCE CREATION =====================================

// Define a configuration object for each resource type.
const resourceConfigurations = {
  trainer: {
    specificTable: "Trainers",
    // Columns as they appear in the database:
    specificFields: [
      "category_id",
      "resource_id",
      "trainer_name",
      "topic_1",
      "topic_2",
      "topic_3",
      "topic_4",
      "topic_other",
      "pt",
      "sp",
      "en",
      "lang_other",
      "travel",
      "national",
      "international"
    ],
    // The field to use for checking the category.
    resourceCategoryField: "category_id",
    // The field to use to obtain the resource name.
    resourceNameField: "trainerName",
    // Mapping: database column -> property in your data.
    fieldMapping: {
      trainer_name: "trainerName",
      topic_1: "topic1",
      topic_2: "topic2",
      topic_3: "topic3",
      topic_4: "topic4",
      topic_other: "topicOther",
      lang_other: "langOther",
      travel: "travelAvailability"
    },
    successMessage: "Trainer added successfully!"
  },
  vehicle: {
    specificTable: "Vehicles",
    specificFields: [
      "license",
      "category_id",
      "resource_id",
      "veh_type",
      "other_veh_type",
      "year",
      "purchase_year",
      "brand",
      "model",
      "VIN",
      "fuel_type",
      "admission_type",
      "cylinders",
      "body_type",
      "transmission",
      "transmission_other",
      "engine_model",
      "engine_size",
      "systems",
      "require_service",
      "service_type",
      "service_freq"
    ],
    // In the form, the resource category is provided as "veh_category_id" 
    resourceCategoryField: "veh_category_id",
    resourceNameField: "license",
    fieldMapping: {
      // Database expects "license"; form uses "license"
      license: "license",
      // In the DB, the column is "category_id" but the form provides "veh_category_id"
      category_id: "veh_category_id",
      veh_type: "veh_type",
      other_veh_type: "other_veh_type",
      year: "year",
      purchase_year: "purchase_year",
      brand: "brand",
      model: "model",
      VIN: "VIN",
      fuel_type: "fuel_type",
      admission_type: "admission_type",
      cylinders: "cylinders",
      body_type: "body_type",
      transmission: "transmission",
      transmission_other: "transmission_other",
      engine_model: "engine_model",
      engine_size: "engine_size",
      // In the DB the column is "systems" while the form field is "system"
      systems: "system",
      require_service: "require_service",
      service_type: "service_type",
      service_freq: "service_freq"
    },
    successMessage: "Vehicle added successfully!"
  },
  equipment: {
    specificTable: "Equipment",
    specificFields: [
      "equipment_name",
      "equipment_sn",
      "equ_category_id",
      "resource_id",
      "equipment_use",
      "equipment_type",
      "equipment_type_other",
      "equipment_mobility",
      "equipment_power",
      "require_service",
      "service_type",
      "service_freq"
    ],
    resourceCategoryField: "equ_category_id",
    resourceNameField: "equipment_name",
    // In equipment, we want the location for the Resources table to come from the form field "equipment_location"
    resourceLocationField: "equipment_location",
    fieldMapping: {},
    successMessage: "Equipment added successfully!"
  },
  multimedia: {
    specificTable: "Multimedia",
    specificFields: [
      "multimedia_name",
      "multimedia_sn",
      "mult_category_id",
      "resource_id",
      "multimedia_type",
      "multimedia_type_other",
      "multimedia_mobility",
      "multimedia_power",
      "use_out_cta"
    ],
    resourceCategoryField: "mult_category_id",
    resourceNameField: "multimedia_name",
    fieldMapping: {},
    successMessage: "Multimedia added successfully!"
  },
  workstation: {
    specificTable: "Workstations",
    specificFields: [
      "workstation_name",
      "workstation_description",
      "work_category_id",
      "resource_id",
      "workstation_qty",
      "workstation_mobility"
    ],
    resourceCategoryField: "work_category_id",
    resourceNameField: "workstation_name",
    fieldMapping: {},
    successMessage: "Workstation added successfully!"
  }
};

/**
 * include resources on specific resource table:
 * 1. CRUD operation to include resource on table.
 * 2. Fetch specific resourceConfigurations to customize resource fields
 * @param {data} resource data
 * @param {Promise<object>} 
 */
// function to create resurces  into new_resources : confirmed
async function createResourceUnified(resourceType, data) {
  const config = resourceConfigurations[resourceType];
  if (!config) {
    throw new Error("Invalid resource type: " + resourceType);
  }

  try {
    // Validate resource category exists.
    const categoryId = data[config.resourceCategoryField];
    const categoryCheck = await connection.query(
      `SELECT COUNT(*) AS counted FROM resource_categories WHERE resource_category_id = ${categoryId}`
    );
    console.log("test: ", categoryCheck)
    if (categoryCheck[0].counted === 0) {
      throw new Error("Invalid resource category ID.");
    }

    // Get resource name from data.
    const resourceName = data[config.resourceNameField];
    if (!resourceName) {
      throw new Error("Resource name is required.");
    }

    // If a resourceLocationField is defined, use that to set data.location.
    if (config.resourceLocationField && data[config.resourceLocationField]) {
      data.location = data[config.resourceLocationField];
    }

    // Check if resource already exists in Resources table.
    let resourceId;
    const existingResourceCheck = await connection.query(
      `SELECT resource_id FROM Resources WHERE resource_name = '${resourceName}'`
    );
    if (existingResourceCheck.length > 0) {
      resourceId = existingResourceCheck[0].resource_id;
    } else {
      // Insert into Resources table.
      const resourceQuery = `
        INSERT INTO Resources (resource_name, resource_category_id, status, location)
        VALUES ('${resourceName}', ${categoryId}, '${data.status}', '${data.location}')
      `;
      await connection.execute(resourceQuery);

      // Retrieve the new resource_id.
      const resourceIdResult = await connection.query(
        `SELECT resource_id FROM Resources WHERE resource_name = '${resourceName}'`
      );
      if (resourceIdResult.length === 0) {
        throw new Error("Failed to retrieve resource_id for the new resource.");
      }
      resourceId = resourceIdResult[0].resource_id;
    }

    // Set the resource_id in the data so it can be used in the specific table INSERT.
    data["resource_id"] = resourceId;

    // Build the INSERT query for the resource‑specific table.
    const columns = config.specificFields
      .map(col => `[${col}]`)  // wrap column names in brackets
      .join(", ");

    // Build the VALUES clause using the mapping.
    // For each field, if config.fieldMapping exists and provides a different key, use that.
    const values = config.specificFields.map(field => {
      const key = (config.fieldMapping && config.fieldMapping[field]) ? config.fieldMapping[field] : field;
      const val = data[key];
      if (val === undefined || val === null) {
        return "NULL";
      } else if (typeof val === "number") {
        return val;
      } else {
        // Escape single quotes (by doubling them) to prevent syntax errors.
        const safeVal = val.toString().replace(/'/g, "''");
        return `'${safeVal}'`;
      }
    }).join(", ");

    const specificQuery = `INSERT INTO ${config.specificTable} (${columns}) VALUES (${values})`;
    console.log("Data passed to createResourceUnified:", data);
    console.log("Resource-specific INSERT query:", specificQuery);
    await connection.execute(specificQuery);

    // Special logic for equipment: if resourceType is "equipment" and equipment_mobility equals "STATIONARY"
    if (
      resourceType === "equipment" &&
      data.equipment_mobility &&
      data.equipment_mobility.toUpperCase() === "STATIONARY"
    ) {
      // Query the Rooms table for room_id where room_name equals data.location.
      const roomQuery = `SELECT room_id FROM Rooms WHERE room_name = '${data.location}'`;
      console.log("Room query:", roomQuery);
      const roomResult = await connection.query(roomQuery);
      if (roomResult.length > 0) {
        const room_id = roomResult[0].room_id;
        const roomEquipmentQuery = `
          INSERT INTO Room_equipment (room_id, resource_id)
          VALUES (${room_id}, ${resourceId})
        `;
        console.log("Room_equipment INSERT query:", roomEquipmentQuery);
        await connection.execute(roomEquipmentQuery);
      } else {
        console.warn(`No room found with name '${data.location}'. Equipment resource will not be associated with a room.`);
      }
    }

    // Insert a message into the Messages table.
    const messageQuery = `
      INSERT INTO Messages (message_type, message_cont, message_status)
      VALUES ('message', 'A new resource ${resourceType} (${resourceName}) has been created', 'not read')
    `;
    await connection.execute(messageQuery);

    return { success: true, message: config.successMessage };

  } catch (error) {
    // Optionally roll back the inserted resource if needed.
    if (data.resource_id) {
      try {
        await connection.execute(`DELETE FROM Resources WHERE resource_id = ${data.resource_id}`);
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }
    console.error("Error adding resource for type", resourceType, "with data:", data, error);
    throw new Error("Error adding resource for type " + resourceType + ": " + error.message);
  }
}

//======== END OF NEW_RESOURCES.HTML || HELPER FUNCTIONS========================

// ===== VIEW_RESOURCES.HTML: CRUD OPERATION TO UPDATE DB ====================

/**
 * CRUD  to uodate resorce status:
 * 1. Change resource status on resource status history.
 * 2. Check if rsh is other that reserved or programed.
 * 3. Validate if status change is viable.
 *
 * @param {data} input
 */
async function updateResource(data) {
  const { resource_id, temporal_status_id, updateReason, startDate, endDate, inactiveReason } = data;

  try {
    // Format dates (ensure that formatDate returns the proper string format for Access)
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    // Check if the resource exists and retrieve its current status.
    const resourceStatusCheck = await connection.query(
      `SELECT status FROM Resources WHERE resource_id = ${resource_id}`
    );
    if (resourceStatusCheck.length === 0) {
      throw new Error('Resource not found in Resources table.');
    }
    const currentStatus = resourceStatusCheck[0].status;
    if (currentStatus === 'Inactive') {
      throw new Error('Resource is inactive, cannot update inactive resources.');
    }

    if (currentStatus === 'Active') {
      if (temporal_status_id) {
        // This is an update scenario.
        const statusQuery = await connection.query(`
          SELECT * FROM ResourceStatusHistory 
          WHERE temporal_status_id = ${temporal_status_id}
        `);
        if (statusQuery.length === 0) {
          throw new Error('Error retrieving status type for resource. No status record found.');
        }
        const statusType = statusQuery[0].status_type;
        console.log(`Found temporal status record for resource ${resource_id} with status type: ${statusType}`);

        if (statusType === 'Programmed' || statusType === 'Reserved') {
          throw new Error('The resource is programmed for an event; update event resources instead.');
        }

        if (updateReason !== 'free') {
          throw new Error('The resource must be released free before updating to a different status.');
        } else if (updateReason === 'free') {
          try {
            const deleteResourceStatus = `
              DELETE FROM ResourceStatusHistory 
              WHERE temporal_status_id = ${temporal_status_id}
            `;
            await connection.execute(deleteResourceStatus);
            console.log(`Deleted temporal status record for temporal_status_id: ${temporal_status_id}`);

            // Insert a message into the Messages table.
            const messageQuery = `
              INSERT INTO Messages (message_type, message_cont, message_status)
              VALUES ('information', 'Temporal status for resource ID: ${temporal_status_id} has been deleted', 'not read')
            `;
            await connection.execute(messageQuery);
            console.log(`Inserted deletion message for temporal_status_id: ${temporal_status_id}`);

            // Return a success message for deletion.
            return { success: true, message: `Resource status (ID: ${temporal_status_id}) has been deleted successfully.` };
          } catch (error) {
            console.error(`Error deleting resource status for temporal_status_id: ${temporal_status_id}`, error);
            throw new Error('Error deleting resource status: ' + JSON.stringify(data) + ' - ' + error.message);
          }
        }
      } else {
        // New record scenario: no existing temporal_status_id provided.
        try {
          const newStatus = `
            INSERT INTO ResourceStatusHistory (resource_id, status_type, start_date, end_date, details)
            VALUES (${resource_id}, '${updateReason}', #${formattedStartDate}#, #${formattedEndDate}#, '${inactiveReason}')
          `;
          await connection.execute(newStatus);
          console.log(`Inserted new temporal status for resource_id: ${resource_id}`);

          const messageQuery = `
            INSERT INTO Messages (message_type, message_cont, message_status)
            VALUES ('message', 'Temporal status for resource ID: ${resource_id} has been created', 'not read')
          `;
          await connection.execute(messageQuery);
          console.log(`Inserted creation message for resource_id: ${resource_id}`);

          // Return a success message for creation.
          return { success: true, message: `New resource status for resource ID: ${resource_id} has been created successfully.` };
        } catch (error) {
          console.error(`Error creating new resource status for resource ID: ${resource_id}`, error);
          throw new Error('Error creating new resource status ' + JSON.stringify(data) + ': ' + error.message);
        }
      }
    }
  } catch (error) {
    console.error('Error updating resource status:', error);
    throw new Error(`Problems updating resource status: ${error.message}`);
  }
}

//============================== END OF VIEW_RESOURCES.HTML FUNCTIONS ====================================

//===============================UPDATE_RESOURCES.HTML // CRUD OPERATIONS===================================

/**
 * Get resource information:
 * 1. get resource by category.
 * 2. 
 * 3. 
 *
 * @param {category} input
 */
// function to retrieve resource data into update_resources : confirmed
async function getResourceDataByCategory(cat) {

  try {
    const sanitizedCat = Number.isInteger(cat) ? cat : 0; // Ensure cat is a number
    // Construct the query string
    const query = `SELECT * FROM Resources WHERE resource_category_id = ${sanitizedCat}`;
    const result = await connection.query(query);
    return result; // Return data and count
  } catch (error) {
    console.error('Error during database query:', error);
    throw new Error('Error during database query: ' + error.message);
  }
};

/**
 * Disables a resource by:
 * 1. Verifying that there is no active assignment on the Event_resources table.
 * 2. Deleting any future ResourceStatusHistory entries.
 * 3. Updating the resource's status to "Inactive".
 *
 * @param {number} resourceId - The ID of the resource to disable.
 */
async function disableResource(resourceId) {
  // 1. Check if the resource is registered in any event.
  if (await checkEventResourceRegistration(resourceId)) {
    console.warn(`Resource ${resourceId} is assigned to an event. Cannot disable.`);
    return { success: false, message: `Resource ${resourceId} is assigned to an event. Cannot disable.` };
  }

  // 2. Check for any future ResourceStatusHistory entries.
  const today = new Date();
  // Define a "max date" so that the check covers all future dates.
  const maxDate = new Date(9999, 11, 31); // December 31, 9999
  if (await checkResourceConflict(resourceId, today, maxDate)) {
    // Remove any future status history.
    await deleteResourceStatusHistoryForResource(resourceId, today);
  }

  // 3. Update the Resources table to mark the resource as Inactive.
  const updateQuery = `
    UPDATE Resources 
    SET status = 'Inactive' 
    WHERE resource_id = ${resourceId}
  `;
  try {
    const deleteResource = await connection.execute(updateQuery);
    if (deleteResource) {
      const deleteMessage = `
      INSERT INTO Messages (message_type, message_cont, message_status)
      VALUES ('information', 'Resource ID: (${resourceId}) has been disabled', 'not read')
    `;
      await connection.execute(deleteMessage);

      return { success: true, message: `Resource ${resourceId} has been disabled successfully.` };
    }
    console.log(`Resource ${resourceId} has been disabled successfully.`);
  } catch (error) {
    console.error(`Error updating resource ${resourceId} status:`, error);
    throw error;
  }
}

/**
 * Delete the resource status:
 * 1. Delete registry of resource status on rsh.
 * 2. Deleting record within dates.
 * 3.
 *
 * @param {number, start date} resourceId - The ID of the resource to disable.
 */
async function deleteResourceStatusHistoryForResource(resourceId, fromDate) {
  const formattedDate = formatDate(fromDate);
  const query = `
    DELETE FROM ResourceStatusHistory 
    WHERE resource_id = ${resourceId} 
      AND start_date > #${formattedDate}#
  `;
  try {
    await connection.execute(query);
    console.log(`Deleted future ResourceStatusHistory entries for resource ${resourceId}`);
    return true;
  } catch (error) {
    console.error(`Error deleting ResourceStatusHistory for resource ${resourceId}:`, error);
    throw error;
  }
}

/**
 * Verify if resource is registered on event:
 * 1. Check event resources.
 * 2. Return if resource is set for event.
 * 3.
 *
 * @param {number} resourceId - The ID of the resource to disable.
 */
async function checkEventResourceRegistration(resourceId) {

  const query = `
    SELECT *
    FROM Event_resources 
    WHERE resource_id = ${resourceId}
      AND assign_status IN ('Reserved', 'Programmed')
  `;
  try {
    const rows = await connection.query(query);
    return rows.length > 0;
  } catch (error) {
    console.error(`Error checking Event_resources for resource ${resourceId}:`, error);
    throw error;
  }
}

//===============END OF UPDATE_RESOURCES.HTML FUNCTIONS=================================================

// ===== VIEW_MESSAGES.HTML: CALLS TO DB FOR MESSAGE CREATION AND RETRIEVAL + CRUD OPPERATIONS =====

/**
 * Query db to retrieve messages:
 * 1. return messages to view_messages.html
 * 2. Populate message lists .
 *
 * @param {messageType, messageStatus} input
 * @param {message count, message type, message} output
 */
async function getSystemMessages(messageType, messageStatus) {

  let query = "";

  try {

    if (!messageType) { // if messageType is an empty string or falsy
      query = `SELECT * FROM Messages WHERE message_status = '${messageStatus}'`;
    } else {
      query = `SELECT * FROM Messages WHERE message_type = '${messageType}' AND message_status = '${messageStatus}'`;
    }
    const rows = await connection.query(query);
    return { data: rows, count: rows.length }; // Return data and count
  } catch (error) {
    console.error('Error during database query:', error);
    throw new Error('Error during database query: ' + error.message);
  }
};

/**
 * Query db to update messages table for read messages:
 * 1. update message table with 'read'
 * 
 *
 * @param {id} input
 * @param {none} output
 */
// function to update message status on view_messages : confirmed
async function markAsRead(id) {
  try {

    const sanitizedId = Number.isInteger(id) ? id : 0; // Ensure id is a number

    const readQuery = `
      UPDATE Messages 
      SET message_status = 'read'
       WHERE ID = ${sanitizedId}
    `;

    await connection.execute(readQuery);

    return { success: true, message: 'Message marked as read successfully!' };
  } catch (error) {
    console.error('Error inserting message:', error);
    throw new Error('Error marking message as read' + error.message);
  }
};

//--------VIEW_MESSAGES / END OF HELPER FUNCTIONS----------

//===========INDEX.HTML ||  HELPER FUNCTIONS TO RETRIEVE KPI´S====================

/**
 * Query db to retrieve crad data:
 * 1. Count to update planned card
 * 
 *
 * @param {none} input
 * @param {none} output
 */
async function getPlCardCount() {

  try {

    const result = await connection.query(`SELECT COUNT(*) AS counted FROM Events WHERE event_status = 'Reserved'`);
    //console.log('Query result:', result);
    return result[0].counted;
  } catch (error) {
    console.error("Error counting events:", error);
    throw new Error("Failed to count events: " + error.message);
  }

};

/**
 * Query db to retrieve card data:
 * 1. Count to update pexecuted card
 * 
 *
 * @param {none} input
 * @param {none} output
 */
async function getExCardCount() {

  try {

    const result = await connection.query(`SELECT COUNT(*) AS counted FROM Events WHERE event_status = 'Executed'`);
    //console.log('Query result:', result);
    return result[0].counted;
  } catch (error) {
    console.error("Error counting events:", error);
    throw new Error("Failed to count events: " + error.message);
  }

};

/**
 * Query db to retrieve card data:
 * 1. Count to update participant card
 * 
 *
 * @param {none} input
 * @param {none} output
 */
async function getParticipantCount() {
  try {

    const result = await connection.query(`
      SELECT IIf(IsNull(SUM(total_part)), 0, SUM(total_part)) AS totalParticipants 
      FROM Participants;
    `);
    //console.log('Query result:', result);

    return result[0].totalParticipants;
  } catch (error) {
    console.error("Error counting planned events:", error);
    throw new Error("Failed to count executed events: " + error.message);
  }
};

/**
 * Query db to retrieve event type data:
 * 1. Query to update event type chart
 * 
 *
 * @param {none} input
 * @param {Array} output
 */
async function getEventType() {
  const query = 'SELECT event_type FROM Events';
  try {
    const rows = await connection.query(query);
    //console.log('db: ', rows);
    return rows;
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

/**
 * Query db to retrieve event warning data:
 * 1. Query to update event deadline warning
 * 
 *
 * @param {none} input
 * @param {Array} output
 */
async function getEventWarning() {
  const query = `SELECT 
  event_name, 
  event_confirmation_deadline,
  DATEDIFF('d', Date(), DateValue(event_confirmation_deadline)) AS DayDifference
FROM Events
WHERE event_status = 'Reserved'`;
  try {

    const rows = await connection.query(query);
    return rows;
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

/**
 * Query db to retrieve participant warning data:
 * 1. Query to update participant warning
 * 
 *
 * @param {none} input
 * @param {Array} output
 */
async function getParticipantWarning() {
  const query = `SELECT 
      E.event_name, 
      E.event_type, 
      E.event_start_date,
      P.required_participants, 
      P.inscribed_participants, 
      P.total_part,
      DateDiff('d', Date(), DateValue(E.event_start_date)) AS DayDifference
  FROM Events AS E
  INNER JOIN Participants AS P 
      ON E.event_id = P.event_id
  WHERE 
      (E.event_type = 'Training P' OR E.event_type = 'Training I')
`;
  try {

    const rows = await connection.query(query);
    return rows;
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

/**
 * Query db to retrieve message count data:
 * 1. Query to update message warning
 * 
 *
 * @param {none} input
 * @param {Array} output
 */
async function getMessageStatus() {

  try {
    const result = await connection.query(`SELECT COUNT(*) AS counted FROM Messages WHERE message_status = 'not read'`);
    return result[0].counted;
  } catch (error) {
    console.error('Error counting messages:', error);
    throw new Error("Failed to count messages: " + error.message);
  }
}

//  SCHEDULLE.HTML POPUP FUNCTIONS TRIGGERED FROM INDEX.HTML
/**
 * Query db to retrieve message count data:
 * 1. Query to update message warning
 * 
 *
 * @param {start_date, end_date} input
 * @param {Array} output
 */
async function getMonthlySchedulle(startDate, endDate) {
  const query = `
    SELECT 
  E.event_id, 
  E.event_name, 
  E.event_start_date, 
  E.event_end_date,
  R.resource_category_id, 
  R.resource_name
FROM 
  (Events AS E 
    INNER JOIN Event_resources AS ER ON E.event_id = ER.event_id)
  INNER JOIN Resources AS R ON ER.resource_id = R.resource_id
WHERE 
  E.event_start_date <= #${endDate}# 
  AND E.event_end_date >= #${startDate}#
  AND (R.resource_category_id = 1 OR R.resource_category_id = 6)`;

  try {

    const rows = await connection.query(query);
    //console.log(rows);
    return rows;
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

//============ END OF HELPER FUNCTIONS / INDEX.HTML

//==============HELPER FUNCTIONS FOR SCHEDULLE.HTML============/

/**
 * CRUD on db to add holiday data:
 * 1. Insert holiday dates on holiday table
 * 
 *
 * @param {data} input
 * @param {Array} output
 */
async function addHoliday(data) {
  const startDate = data.holidayStart;
  const endDate = data.holidayEnd;
  const holidayDesc = data.holidayText;

  try {
    const query = `
    INSERT INTO Holidays (start_date, end_date, holiday)
    VALUES (${startDate}, ${endDate}, '${holidayDesc}')
  `;
    await connection.execute(query);
    // Return a success message for creation.
    return { success: true, message: `New holiday has been created successfully.` };
  } catch (error) {
    console.error(`Error creating new holiday`, error);
    throw new Error('Error creating new holiday' + error.message)
  }

}

/**
 * Query on db to get holiday data:
 * 1. retrieve holiday dates from holiday table
 * 
 *
 * @param {month} input
 * @param {Object} output
 */
async function getHoliday(start, end) {
  const query = `SELECT * FROM Holidays WHERE start_date <= #${end}# AND end_date >= #${start}#`;

  try {

    const rows = await connection.query(query);
    //console.log(rows);
    return rows;
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

/**
 * Query on db to get holiday data:
 * 1. retrieve holiday dates from holiday table
 * 
 *
 * @param {month} input
 * @param {Object} output
 */
async function getStatusTableData(start, end) {
  const query = `
    SELECT 
  E.event_id, 
  E.event_name,
  E.event_status,
  E.event_start_date,
  E.event_end_date, 
  P.required_participants, 
  P.inscribed_participants
FROM 
  (Events AS E 
    INNER JOIN Participants AS P ON E.event_id = P.event_id)
WHERE 
  E.event_start_date <= #${end}# 
  AND E.event_end_date >= #${start}#`;

  try {

    const rows = await connection.query(query);
    //console.log(rows);
    return rows;
  } catch (error) {
    console.error('Error fetching status data for schedulle:', error);
    return [];
  }
}

//============END OF HELPER FUNCTIONS====================/

module.exports = {
  getUserData, getRoomsData, getTrainersData, getVehicleData, getEquipmentData, getMultimediaData, getWorkstationData, updateResource, getTrainingData,
  getEventRoomData, getEventTrainerData, getEventVehicleData, getEventEquipmentData, getEventMultimediaData, getEventWorkstationData, createResourceUnified,
  getSystemMessages, markAsRead, getResourceDataByCategory, createEvent, disableResource, getEventsData, getUpdateEventData, getEventResources, getReservedResources,
  confirmEvent, cancelEvent, updateParticipants, endEvent, replaceEventResources, getPlCardCount, getExCardCount, getParticipantCount, getEventType, getEventWarning,
  getParticipantWarning, getMessageStatus, getMonthlySchedulle, addHoliday, getHoliday, getStatusTableData
};

