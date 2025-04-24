const { app, BrowserWindow, ipcMain, screen } = require('electron');
const log = require('electron-log');
const path = require('path');

// added version to handle IPC call on electron´s contextbridge
const db = require('./js/db.js'); // Adjust path if needed

// Global error handlers in main process
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception in main:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection in main:', reason, promise);
});

let mainWindow;

app.on('ready', () => {

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // added version to handle IPC call on electron´s contextbridge
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '/html/index.html'));

});


/**
 * Function to create and open a popup window
 * 1. Open visualization window calender.html.
 * 2. DIsplay as separate window.
 * 
 *
 * @param {none}
 */
ipcMain.on('open-popup', () => {
  const popup = new BrowserWindow({
    width: 1270,
    height: 900,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });


  popup.loadFile(path.join(__dirname, 'html/schedulle.html'));

  popup.on('closed', () => {
    console.log('Popup window closed');
  });
});


// ===== INDEX.HTML: CALLS TO DB FOR DATA RETRIEVAL AND CRUD OPPERATIONS =====

/**
 * Main handler for user data:
 * 1. return user data to index.html.
 * 2. enable or disable menu options by user profile.
 * 3. display user name on header.
 *
 * @param {userCode}
 */
ipcMain.handle('db-getUserData', async (event, userCode) => {
  try {
    const user = await db.getUserData(userCode);
    return user;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// ===== NEW_EVENT.HTML: CALLS TO DB FOR DATA RETRIEVAL AND CRUD OPPERATIONS =====

/**
 * Main handler for training data:
 * 1. return training data to new_event.html.
 * 2. Populate search suggestion for training or event data.
 * 3. Training data is used to define event type".
 *
 * @param {none}
 */
ipcMain.handle('db-getTrainingData', async (event) => {
  try {
    const training = await db.getTrainingData();
    return training;
  } catch (error) {
    log.error('Error in db-getTrainingData: ', error);
    return { success: false, message: error.message };
  }
});


/* Main handler for reserved resources data:
* 1. return resource status to new_event.html.
* 2. Used to disable resources checboxes for event data.
* 3. 
*
* @param {start_date. end_date}
*/
ipcMain.handle('db-getReservedResources', async (event, start_date, end_date) => {

  try {
    const result = await db.getReservedResources(start_date, end_date);
    return result;
  } catch (error) {
    log.error('Error in db-getReservedResources IPC handler:', error);
    return { success: false, message: error.message };
  }
});

/* Main handler for create event:
* 1. sent event data to createEvent on db.js.
* 2. triggers event creation process.
* 3. 
*
* @param {eventData, user}
*/
ipcMain.handle('db-createEvent', async (event, eventData, user) => {
  try {
    const result = await db.createEvent(eventData, user);
    return result; 
  } catch (error) {
    log.error('Error in db-createEvent IPC handler:', error);
    return { success: false, message: "An unexpected error occurred during event creation." };
  }
});

/* Main handler for view event:
* 1. Fetch event data to cview on view_event.html.
* 2. provides data to display event info.
* 3. 
*
* @param {startDate, endDate}
*/
ipcMain.handle('db-getEventsData', async (event, startDate, endDate) => {
  try {
    const result = await db.getEventsData(startDate, endDate);
    return result;
  } catch (error) {
    console.error('Error in db-getEventsData IPC handler:', error);
    return { success: false, message: error.message };
  }
});

/* Main handler for update event:
* 1. Fetch event data to view on update_event.html.
* 2. provides data to display event info.
* 3. 
*
* @param {startDate, endDate}
*/
ipcMain.handle('db-getUpdateEventData', async (event) => {
  try {
    const updateEvent = await db.getUpdateEventData();
    return updateEvent;
  } catch (error) {
    console.error('Error in db-getUpdateEventData:', error);
    return { success: false, message: error.message };
  }
});

/* Main handler for get update event resources:
* 1. Fetch event resource data to view on update_event.html.
* 2. provides data to populate checkboxes with event resources info.
* 3. 
*
* @param {eventId}
*/
ipcMain.handle('db-getEventResources', async (event, eventId) => {
  try {
    const result = await db.getEventResources(eventId);
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler for get update event resources:
* 1. Fetch room data data to view on update_event.html.
* 2. provides data to create checkboxes with event resources info.
* 3. 
*
* @param {}
*/
ipcMain.handle('db-getEventRoomData', async (event) => {
  try {
    const eventRoom = await db.getEventRoomData();
    return eventRoom;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler for get update event resources:
* 1. Fetch trainer data data to view on update_event.html.
* 2. provides data to create checkboxes with event resources info.
* 3. 
*
* @param {}
*/
ipcMain.handle('db-getEventTrainerData', async (event) => {
  try {
    const eventTrainer = await db.getEventTrainerData();
    return eventTrainer;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler for get update event resources:
* 1. Fetch vehicle data data to view on update_event.html.
* 2. provides data to create checkboxes with event resources info.
* 3. 
*
* @param {}
*/
ipcMain.handle('db-getEventVehicleData', async (event) => {
  try {
    const eventVehicle = await db.getEventVehicleData();
    return eventVehicle;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler for get update event resources:
* 1. Fetch equipment data data to view on update_event.html.
* 2. provides data to create checkboxes with event resources info.
* 3. 
*
* @param {}
*/
ipcMain.handle('db-getEventEquipmentData', async (event) => {
  try {
    const eventEquipment = await db.getEventEquipmentData();
    return eventEquipment;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler for get update event resources:
* 1. Fetch multimedia data data to view on update_event.html.
* 2. provides data to create checkboxes with event resources info.
* 3. 
*
* @param {}
*/
ipcMain.handle('db-getEventMultimediaData', async (event) => {
  try {
    const eventMultimedia = await db.getEventMultimediaData();
    return eventMultimedia;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler for get update event resources:
* 1. Fetch workstationdata data to view on update_event.html.
* 2. provides data to create checkboxes with event resources info.
* 3. 
*
* @param {}
*/
ipcMain.handle('db-getEventWorkstationData', async (event) => {

  try {

    const eventWorkstation = await db.getEventWorkstationData();
    return eventWorkstation;
  } catch (error) {
    return { success: false, message: error.message };
  }
});


/* Main handler for update event status:
* 1. send event data to  update event on db.
* 2. trigers event resource status update.
* 3. 
*
* @param {}
*/
ipcMain.handle('db-confirmEvent', async (event, eventId) => {

  try {

    const confirmEvent = await db.confirmEvent(eventId);
    return { success: true, message: 'Update successful', data: confirmEvent };
  } catch (error) {
    return { success: false, message: error.message };
  }
});


/* Main handler for cancel event status:
* 1. send event data to cancel event on db.
* 2. trigers event resource status delete.
* 3. 
*
* @param {eventId} input
*/
ipcMain.handle('db-cancelEvent', async (event, eventId) => {

  try {

    const cancelEvent = await db.cancelEvent(eventId);
    return { success: true, message: 'Delete successful', data: cancelEvent };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler for update participant registration:
* 1. Send participant number to Partcipant table on db.
*
* @param {participants, eventId} input
*/
ipcMain.handle('db-updateParticipants', async (event, participants, eventId) => {

  try {

    const participantNumber = await db.updateParticipants(participants, eventId);
    return { success: true, message: 'Participant update successful', data: participantNumber };
  } catch (error) {
    return { success: false, message: error.message };
  }
});


/* Main handler for close event:
* 1. Send total participant number to Partcipant table on db.
* 2. Set event staus to executed 
*
* @param {participants, eventId} input
*/
ipcMain.handle('db-endEvent', async (event, participants, eventId) => {

  try {

    const endEvent = await db.endEvent(participants, eventId);
    return { success: true, message: 'Event status update successful', data: endEvent };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler for replace event resources:
* 1. Send resources to delete on event resources table on db.
* 2. Send resources to delete on resource status history table on db
* 3. Send resources to include on event resources table on db
* 4. Send resources to include on resource status history table on db
*
* @param {targetEventId, updateStartDate, updateEndDate, toDeleteResourses, toIncludeResources} input
*/
ipcMain.handle('db-replaceEventResources', async (event, targetEventId, targetEventName, updateStartDate, updateEndDate, toDeleteResourses, toIncludeResources) => {

  try {

    const replaceEvent = await db.replaceEventResources(targetEventId, targetEventName, updateStartDate, updateEndDate, toDeleteResourses, toIncludeResources);
    return { success: true, message: 'Event resources update successful', data: replaceEvent };
  } catch (error) {
    return { success: false, message: error.message };
  }
});


//======= VIEW_RESOURCES.HTML / CRUD OPERATIONS TO VIEN AND UPDATE RESOURCE STATUS================

/* Main handler for room data:
* 1. return room data to new_event.html.
* 2. Populate checboxes for event data.
* 3. 
*
* @param {none}
*/
ipcMain.handle('db-getRoomsData', async (event, date) => {

  try {

    const rooms = await db.getRoomsData(date);
    return rooms;
  } catch (error) {
    log.error('Error in db-getRoomData: ', error);
    return { success: false, message: error.message };
  }
});

/* Main handler for trainer data:
* 1. return trainer data to new_event.html.
* 2. Populate checboxes for event data.
* 3. 
*
* @param {none}
*/
ipcMain.handle('db-getTrainersData', async (event, date) => {

  try {

    const trainers = await db.getTrainersData(date);
    return trainers;
  } catch (error) {
    log.error('Error in db-getTrainersData: ', error);
    return { success: false, message: error.message };
  }
});

/* Main handler for vehicles data:
* 1. return vehicles data to new_event.html.
* 2. Populate checboxes for event data.
* 3. 
*
* @param {none}
*/
ipcMain.handle('db-getVehicleData', async (event, date) => {

  try {

    const vehicles = await db.getVehicleData(date);
    return vehicles;
  } catch (error) {
    log.error('Error in db-getVehicleData: ', error);
    return { success: false, message: error.message };
  }
});

/* Main handler for equipment data:
* 1. return equipment data to new_event.html.
* 2. Populate checboxes for event data.
* 3. 
*
* @param {none}
*/
ipcMain.handle('db-getEquipmentData', async (event, date) => {

  try {

    const equipment = await db.getEquipmentData(date);
    return equipment;
  } catch (error) {
    log.error('Error in db-getEquipmentData: ', error);
    return { success: false, message: error.message };
  }
});

/* Main handler for Multimedia data:
* 1. return Multimedia data to new_event.html.
* 2. Populate checboxes for event data.
* 3. 
*
* @param {none}
*/
ipcMain.handle('db-getMultimediaData', async (event, date) => {

  try {

    const multimedia = await db.getMultimediaData(date);
    return multimedia;
  } catch (error) {
    log.error('Error in db-getMultimediaData: ', error);
    return { success: false, message: error.message };
  }
});

/* Main handler for workstation data:
* 1. return workstation data to new_event.html.
* 2. Populate checboxes for event data.
* 3. 
*
* @param {date}
*/
ipcMain.handle('db-getWorkstationData', async (event, date) => {

  try {

    const workstation = await db.getWorkstationData(date);
    return workstation;
  } catch (error) {
    log.error('Error in db-getWorkstationData: ', error);
    return { success: false, message: error.message };
  }
});


/* Main handler for update resource status:
* 1. Send resources to update on resource status history table on db.
* 
*
*
* @param {data} input
*/
ipcMain.handle('db-updateResource', async (event, data) => {
  try {
    const result = await db.updateResource(data);
    return { success: true, message: 'Update successful', data: result };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler to retrieve resource:
* 1. Send resources to update_resource.htm.
* 
*
*
* @param {category} input
*/
ipcMain.handle('db-getResourceDataByCategory', async (event, cat) => {
  try {
    const result = await db.getResourceDataByCategory(cat);
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler to disable resource:
* 1. SGet call from update_resource.htm.
* 2. Update resource status on resources table db.
*
*
* @param {cresource id} input
*/
ipcMain.handle('db-disableResource', async (event, resourceId) => {
  try {
    const result = await db.disableResource(resourceId);
    return result; 
  } catch (error) {
    console.error('Error in db-disableResource IPC handler:', error);
    return { success: false, message: "An unexpected error occurred during disabling resource." };
  }
});


/* Main handler to create resource:
* 1. Get call from new_resource.htm.
* 2. Create resource on resource specific table db.
*
*
* @param {resource type, data} input
*/
ipcMain.handle('db-createResourceUnified', async (event, resourceType, data) => {
  try {
    const result = await db.createResourceUnified(resourceType, data);
    return result; 
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler tofetch mesages:
* 1. Get messages from message table on db.
* 2. serve messages to view_mesages.html.
*
*
* @param {resource type, data} input
*/
ipcMain.handle('db-getSystemMessages', async (event, messageType, messageStatus) => {
  try {
    const { data, count } = await db.getSystemMessages(messageType, messageStatus);
    return { data, count };
  } catch (error) {
    console.error('Error in IPC handler:', error);
    return { success: false, message: error.message };
  }
});

/* Main handler to change message status:
* 1. set action to change message status on db.
*
* @param {resource type, data} input
*/
ipcMain.handle('db-markAsRead', async (event, id) => {
  try {
    const result = await db.markAsRead(id);
    return { success: true, message: 'Marked as read', data: result };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler to get palnned event count:
* 1. Query db to get participant count on db.
*
* @param {resource type, data} input
*/
ipcMain.handle('db-getPlCardCount', async (event) => {
  try {
    const result = await db.getPlCardCount();
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler to get palnned event count:
* 1. Query db to get participant count on db.
*
* @param {none} input
*/
ipcMain.handle('db-getExCardCount', async (event) => {
  try {
    const result = await db.getExCardCount();
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler to get participant count:
* 1. Query db to get participant count on db.
*
* @param {none} input
*/
ipcMain.handle('db-getParticipantCount', async (event) => {
  try {
    const result = await db.getParticipantCount();
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler to get event type:
* 1. Query db to get event type from db.
*
* @param {none} input
*/
ipcMain.handle('db-getEventType', async (event) => {
  try {
    const result = await db.getEventType();
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler to get event warning:
* 1. Query db to get event warning.
*
* @param {none} input
*/
ipcMain.handle('db-getEventWarning', async (event) => {
  try {
    const result = await db.getEventWarning();
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler to get participant warning:
* 1. Query db to get participant warning.
*
* @param {none} input
*/
ipcMain.handle('db-getParticipantWarning', async (event) => {
  try {
    const result = await db.getParticipantWarning();
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
});


/* Main handler to get participant warning:
* 1. Query db to get participant warning.
*
* @param {none} input
*/
ipcMain.handle('db-getMessageStatus', async (event) => {
  try {
    const result = await db.getMessageStatus();
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler to get weekly scheddulle:
* 1. Query db to get event and event resources.
*
* @param {start date, end date} input
*/
ipcMain.handle('db-getMonthlySchedulle', async (event, startDate, endDate) => {
  try {
    const result = await db.getMonthlySchedulle(startDate, endDate);
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler to add holiday date:
* 1. CRUD on db to add holidays to db table.
*
* @param {data} input
*/
ipcMain.handle('db-addHoliday', async (event, data) => {
  try {
    const result = await db.addHoliday(data);
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/* Main handler to get holidays:
* 1. Query db to get monthly holidays.
*
* @param {month} input
*/
ipcMain.handle('db-getHoliday', async (event, start, end) => {
  try {
    const result = await db.getHoliday(start, end);
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
});


/* Main handler to get status table data:
* 1. Query db to get monthly statuss.
*
* @param {month} input
*/
ipcMain.handle('db-getStatusTableData', async (event, start, end) => {
  try {
    const result = await db.getStatusTableData(start, end);
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
});



/* Main handler to get page on navigation button click:
* 1. provide navigation handler for electron
*
* @param {target page} input
*/
ipcMain.on('navigate-to', (event, targetPage) => {
  const filePath = path.join(__dirname, `html/${targetPage}`);
  mainWindow.loadFile(filePath);
});

/* Main handler to close app:
* 1. provide function to close app
*
* @param {none} input
*/
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});