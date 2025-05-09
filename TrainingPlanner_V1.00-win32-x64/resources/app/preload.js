// Preload script for secure communication between main and renderer processes
const { ipcRenderer, contextBridge } = require('electron');


// Expose a safe API for the renderer process
contextBridge.exposeInMainWorld('api', {
  navigateTo: (targetPage) => ipcRenderer.send('navigate-to', targetPage),

  openPopup: () => ipcRenderer.send('open-popup'),

  onAppClosing: (callback) => ipcRenderer.on('app-closing', callback),


  /**
  * Expose user data:
  * 1. return user data to index.html.
  * 2. provide user profile to enable nav menu.
  * 3. provide user name to populate header".
  *
  * @param {none}
  */
  getUserData: async (userCode) => {
    try {
      return await ipcRenderer.invoke('db-getUserData', userCode);
    } catch (error) {
      console.log('preload.js error in db-getUserData:', error);
      throw error;
    }
  },

  /**
  * Expose training data:
  * 1. return training data to new_event.html.
  * 2. Populate search suggestion for training or event data.
  * 3. Training data is used to define event type".
  *
  * @param {none}
  */
  getTrainingData: async () => {
    try {
      return await ipcRenderer.invoke('db-getTrainingData');
    } catch (error) {
      console.log('preload.js error in db-getTrainingData:', error);
      throw error;
    }
  },

  /**
  * expose room data:
  * 1. return room data to new_event.html.
  * 2. transfer information to loadRoomData.
  * 3. room data is used to fill selection checkboxes".
  *
  * @param {none}
  */
  getEventRoomData: async () => {
    try {
      return await ipcRenderer.invoke('db-getEventRoomData');
    } catch (error) {
      console.log('preload.js error in db-getEventRoomData:', error);
      throw error;
    }
  },

  /**
 * expose trainer data:
 * 1. return trainer data to new_event.html.
 * 2. transfer information to loadTrainerData.
 * 3. Trainer data is used to fill selection checkboxes".
 *
 * @param {none}
 */
  getEventTrainerData: async () => {
    try {
      return await ipcRenderer.invoke('db-getEventTrainerData');
    } catch (error) {
      console.log('preload.js error in db-getEventTrainerData:', error);
      throw error;
    }
  },

  /**
 * expose vehicle data:
 * 1. return vehicle data to new_event.html.
 * 2. transfer information to loadVehicleData.
 * 3. vehicle data is used to fill selection checkboxes".
 *
 * @param {none}
 */
  getEventVehicleData: async () => {
    try {
      return await ipcRenderer.invoke('db-getEventVehicleData');
    } catch (error) {
      console.log('preload.js error in db-getEventVehicleData:', error);
      throw error;
    }
  },

  /**
 * expose equipment data:
 * 1. return equipment data to new_event.html.
 * 2. transfer information to loadEquipmentData.
 * 3. equipment data is used to fill selection checkboxes".
 *
 * @param {none}
 */
  getEventEquipmentData: async () => {
    try {
      return await ipcRenderer.invoke('db-getEventEquipmentData');
    } catch (error) {
      console.log('preload.js error in db-getEventEquipmentData:', error);
      throw error;
    }
  },

  /**
 * expose multimedia data:
 * 1. return multimedia data to new_event.html.
 * 2. transfer information to loadMultimediaData.
 * 3. Multimedia data is used to fill selection checkboxes".
 *
 * @param {none}
 */
  getEventMultimediaData: async () => {
    try {
      return await ipcRenderer.invoke('db-getEventMultimediaData');
    } catch (error) {
      console.log('preload.js error in db-getEventMultimediaData:', error);
      throw error;
    }
  },

  /**
 * expose workstation data:
 * 1. return workstation data to new_event.html.
 * 2. transfer information to loadWorkstationData.
 * 3. workstation data is used to fill selection checkboxes".
 *
 * @param {none}
 */
  getEventWorkstationData: async () => {
    try {
      return await ipcRenderer.invoke('db-getEventWorkstationData');
    } catch (error) {
      console.log('preload.js error in db-getEventWorkstationData:', error);
      throw error;
    }
  },

  /**
   * expose reserved resource data:
   * 1. return resource status data to new_event.html.
   * 2. transfer information to getReservedResourceData.
   * 3. resource data is used to disable selection checkboxes".
   *
   * @param {start_date, end-date}
   */
  getReservedResources: async (start_date, end_date) => {

    try {
      return await ipcRenderer.invoke('db-getReservedResources', start_date, end_date);
    } catch (error) {
      console.log('preload.js error in db-getReservedResources:', error);
      return { success: false, message: 'unexpected error in getting event resource data, Please contact support.' };
    }
  },

  /**
   * expose create event data:
   * 1. sent event data to db.js
   * 2. transfer information to createEvent.
   * 3. triggers event creation.
   *
   * @param {eventdata. user}
   */
  createEvent: async (eventData, user) => {
    try {
      return await ipcRenderer.invoke('db-createEvent', eventData, user);
    } catch (error) {
      console.log('preload.js error in db-createEvent:', error);
      return { success: false, message: "Unexpected error in event creation. Please contact support." };
    }
  },

  /**
   * expose retrieve event data:
   * 1. fetch event data from db.js
   * 2. transfer information to updateSchedule (view_event.html).
   * 3. .
   *
   * @param {startDate, endDate}
   */
  getEventsData: async (startDate, endDate) => {
    try {
      return await ipcRenderer.invoke('db-getEventsData', startDate, endDate);
    } catch (error) {
      console.log('preload.js error in db-getEventsData:', error);
      return { success: false, message: "Unexpected error in getting events data. Please contact support." };
    }
  },

  /**
    * expose retrieve event data:
    * 1. fetch event data from db.js
    * 2. transfer information to search suggestion (update_event.html).
    * 3. .
    *
    * @param {startDate, endDate}
    */
  getUpdateEventData: async () => {
    try {
      return await ipcRenderer.invoke('db-getUpdateEventData');
    } catch (error) {
      console.error('preload.js error in db-getUpdateEventData:', error);
      throw error;
    }
  },

  /**
    * expose retrieve event resources data:
    * 1. fetch event resources data from db.js
    * 2. transfer information to populate checkboxes (update_event.html).
    * 3. .
    *
    * @param {eventId}
    */
  getEventResources: async (eventId) => {
    try {
      return await ipcRenderer.invoke('db-getEventResources', eventId);
    } catch (error) {
      console.error('preload.js error in db-getEventResources:', error);
      throw error;
    }
  },

  /**
  * expose confirm event:
  * 1. Update event status on db
  * 2. update event resources status on db
  * 3. update resource status history on db.js.
  * 3. .
  *
  * @param {eventId}
  */
  confirmEvent: async (eventId) => {
    try {
      return await ipcRenderer.invoke('db-confirmEvent', eventId);
    } catch (error) {
      console.error('preload.js error in db-confirmEvent:', error);
      throw error;
    }
  },

  /**
      * expose cancel event:
      * 1. delete event status on db
      * 2. delete event resources status on db
      * 3. delete resource status history on db.js.
      * 3. .
      *
      * @param {eventId}
      */
  cancelEvent: async (eventId) => {
    try {
      return await ipcRenderer.invoke('db-cancelEvent', eventId);
    } catch (error) {
      console.error('preload.js error in db-cancelEvent:', error);
      throw error;
    }
  },

  /**
  * expose update participants:
  * 1. update registered participants for event
  *
  * @param {Participants, eventId} input
  */
  updateParticipants: async (participants, eventId) => {
    try {
      return await ipcRenderer.invoke('db-updateParticipants', participants, eventId);
    } catch (error) {
      console.error('preload.js error in db-updateParticipants:', error);
      throw error;
    }
  },

  /**
  * expose close event:
  * 1. close the event when done
  * 2. update db event with 'executed'
  *
  * @param {Participants, eventId} input
  */
  endEvent: async (participants, eventId) => {
    try {
      return await ipcRenderer.invoke('db-endEvent', participants, eventId);
    } catch (error) {
      console.error('preload.js error in db-endEvent:', error);
      throw error;
    }
  },

  /**
  * expose update event resources:
  * 1. Change event resources
  * 2. add o delete event resources as required
  *
  * @param {targetEventId, updateStartDate, updateEndDate, toDeleteResources, toIncludeResources} input
  */
  replaceEventResources: async (targetEventId, targetEventName, updateStartDate, updateEndDate, toDeleteResources, toIncludeResources) => {
    try {
      return await ipcRenderer.invoke('db-replaceEventResources', targetEventId, targetEventName, updateStartDate, updateEndDate, toDeleteResources, toIncludeResources);
    } catch (error) {
      console.error('preload.js error in db-replaceEventResources:', error);
      throw error;
    }
  },

  /**
  * expose get resources :
  * 1. retrieves room data
  * 2. feed data to fill tab on view_resources.html
  *
  * @param {date} input
  */
  getRoomsData: async (date) => {
    try {
      return await ipcRenderer.invoke('db-getRoomsData', date);
    } catch (error) {
      console.error('preload.js error in db-getRoomsData:', error);
      throw error;
    }
  },

  /** 
  * expose get resources :
  * 1. retrieves trainer data
  * 2. feed data to fill tab on view_resources.html
  *
  * @param {date} input
  */
  getTrainersData: async (date) => {
    try {
      return await ipcRenderer.invoke('db-getTrainersData', date);
    } catch (error) {
      console.error('preload.js error in db-getTrainersData:', error);
      throw error;
    }
  },

  /** 
  * expose get resources :
  * 1. retrieves vehicles data
  * 2. feed data to fill tab on view_resources.html
  *
  * @param {date} input
  */
  getVehicleData: async (date) => {
    try {
      return await ipcRenderer.invoke('db-getVehicleData', date);
    } catch (error) {
      console.error('preload.js error in db-getVehicleData:', error);
      throw error;
    }
  },

  /** 
  * expose get resources :
  * 1. retrieves equipment data
  * 2. feed data to fill tab on view_resources.html
  *
  * @param {date} input
  */
  getEquipmentData: async (date) => {
    try {
      return await ipcRenderer.invoke('db-getEquipmentData', date);
    } catch (error) {
      console.error('preload.js error in db-getEquipmentData:', error);
      throw error;
    }
  },

  /** 
  * expose get resources :
  * 1. retrieves multimedia data
  * 2. feed data to fill tab on view_resources.html
  *
  * @param {date} input
  */
  getMultimediaData: async (date) => {
    try {
      return await ipcRenderer.invoke('db-getMultimediaData', date);
    } catch (error) {
      console.error('preload.js error in db-getMultimediaData:', error);
      throw error;
    }
  },

  /** 
  * expose get resources :
  * 1. retrieves workstation data
  * 2. feed data to fill tab on view_resources.html
  *
  * @param {date} input
  */
  getWorkstationData: async (date) => {
    try {
      return await ipcRenderer.invoke('db-getWorkstationData', date);
    } catch (error) {
      console.error('preload.js error in db-getWorkstationData:', error);
      throw error;
    }
  },

  /** 
  * expose update resources :
  * 1. Call for CRUD operation 
  * 2. Transfer resource update data from view_resources.html
  * 3. Update resource status on rsh table (db)
  *
  * @param {date} input
  */
  updateResource: async (data) => {
    try {
      return await ipcRenderer.invoke('db-updateResource', data);
    } catch (error) {
      console.error('preload.js error in db-updateResource:', error);
      throw error;
    }
  },

  /** 
  * expose get resources :
  * 1. Call for CRUD operation 
  * 2. create chache of resource data for update_resources.html
  *
  * @param {category} input
  */
  getResourceDataByCategory: async (cat) => {
    try {
      return await ipcRenderer.invoke('db-getResourceDataByCategory', cat);
    } catch (error) {
      console.error('preload.js error in db-getResourceDataByCategory:', error);
      throw error;
    }
  },

  /** 
  * expose disable resources :
  * 1. Call for CRUD operation 
  * 2. Transfer resource update call from update_resources.html
  * 3. Update resource status on resource table (db)
  *
  * @param {date} input
  */
  disableResource: async (resourceId) => {
    try {
      return await ipcRenderer.invoke('db-disableResource', resourceId);
    } catch (error) {
      console.error('preload.js error in db-disableResource:', error);
      return { success: false, message: "Unexpected error in disabling resource. Please contact support." };
    }
  },

  /** 
  * expose create resources :
  * 1. Call for CRUD operation 
  * 2. Transfer resource create call from new_resources.html
  * 3. Create resource on specific resource table (db)
  *
  * @param {date} input
  */
  createResourceUnified: async (resourceType, data) => {
    try {
      return await ipcRenderer.invoke('db-createResourceUnified', resourceType, data);
    } catch (error) {
      console.error('preload.js error in db-createResourceUnified:', error);
      throw error;
    }
  },

  /** 
   * Fetch stored messages :
   * 1. Call for CRUD operation 
   * 2. Transfer messages to view_messages.html
   * 3. provide message count by type
   * 4. provide message status
   * 
   * @param {message type, status} input
   */
  getSystemMessages: async (messageType, messageStatus) => {
    try {
      const result = await ipcRenderer.invoke('db-getSystemMessages', messageType, messageStatus);
      return result;
    } catch (error) {
      console.error('preload.js error in db-getSystemMessages:', error);
      throw error;
    }
  },

  /** 
  * Call to set message status :
  * 1. Call for CRUD operation 
  * 2. set message status as read on db
  * 
  * @param {message type, status} input
  */
  markAsRead: async (id) => {
    try {
      return await ipcRenderer.invoke('db-markAsRead', id);
    } catch (error) {
      console.error('preload.js error in db-markAsRead:', error);
      throw error;
    }
  },

  /** 
  * Call to get planned events :
  * 1. Call for CRUD operation 
  * 2. Get planned event count
  * 3. 
  * 
  * @param {type} input
  */
  getPlCardCount: async () => {
    try {
      const result = await ipcRenderer.invoke('db-getPlCardCount');
      return result;
    } catch (error) {
      console.error('preload.js error in db-getPlCardCount:', error);
      throw error;
    }
  },

  /** 
  * Call to get executed events :
  * 1. Call for CRUD operation 
  * 2. Get planned event count
  * 3. 
  * 
  * @param {type} input
  */
  getExCardCount: async () => {
    try {
      const result = await ipcRenderer.invoke('db-getExCardCount');
      return result;
    } catch (error) {
      console.error('preload.js error in db-getExCardCount:', error);
      throw error;
    }
  },

  /** 
  * Call to get total participants:
  * 1. Call for CRUD operation 
  * 2. Get planned event count
  * 3. 
  * 
  * @param {none} input
  */
  getParticipantCount: async () => {
    try {
      const result = await ipcRenderer.invoke('db-getParticipantCount');
      return result;
    } catch (error) {
      console.error('preload.js error in db-getParticipantCount:', error);
      throw error;
    }
  },

  /** 
    * Call to get total event types:
    * 1. Call for CRUD operation 
    * 2. Get event type count
    * 3. 
    * 
    * @param {none} input
    */
  getEventType: async () => {
    try {
      const result = await ipcRenderer.invoke('db-getEventType');
      return result;
    } catch (error) {
      console.error('preload.js error in db-getEventType:', error);
      throw error;
    }
  },

  /** 
    * Call to get total event warnings:
    * 1. Call for CRUD operation 
    * 2. Get event warnings
    * 3. 
    * 
    * @param {none} input
    */
  getEventWarning: async () => {
    try {
      const result = await ipcRenderer.invoke('db-getEventWarning');
      return result;
    } catch (error) {
      console.error('preload.js error in db-getEventWarning:', error);
      throw error;
    }
  },

  /** 
    * Call to get participant warnings:
    * 1. Call for CRUD operation 
    * 2. Get participant warnings
    * 3. 
    * 
    * @param {none} input
    */
  getParticipantWarning: async () => {
    try {
      const result = await ipcRenderer.invoke('db-getParticipantWarning');
      return result;
    } catch (error) {
      console.error('preload.js error in db-getParticipantWarning:', error);
      throw error;
    }
  },

  /** 
    * Call to get participant warnings:
    * 1. Call for CRUD operation 
    * 2. Get participant warnings
    * 3. 
    * 
    * @param {none} input
    */
  getMessageStatus: async () => {
    try {
      const result = await ipcRenderer.invoke('db-getMessageStatus');
      return result;
    } catch (error) {
      console.error('preload.js error in db-getMessageStatus:', error);
      throw error;
    }
  },

  /** 
    * Call to get schedule weekly data:
    * 1. Call for CRUD operation 
    * 2. Get event & resources for month
    * 3. 
    * 
    * @param {startDate, endDate} input
    */
  getMonthlySchedule: async (startDate, endDate) => {
    try {
      const result = await ipcRenderer.invoke('db-getMonthlySchedule', startDate, endDate);
      return result;
    } catch (error) {
      console.error('preload.js error in db-getMonthlySchedule:', error);
      throw error;
    }
  },

  /** 
    * Call to add holiday data:
    * 1. Call for CRUD operation 
    * 2. add holidays information
    * 3. 
    * 
    * @param {data} input
    */
  addHoliday: async (data) => {
    try {
      const result = await ipcRenderer.invoke('db-addHoliday', data);
      return result;
    } catch (error) {
      console.error('preload.js error in db-addHoliday:', error);
      throw error;
    }
  },

  /** 
    * Call to get schedule weekly data:
    * 1. Call for CRUD operation 
    * 2. Get event & resources for month
    * 3. 
    * 
    * @param {month} input
    */
  getHoliday: async (start, end) => {
    try {
      const result = await ipcRenderer.invoke('db-getHoliday', start, end);
      return result;
    } catch (error) {
      console.error('preload.js error in db-getHoliday:', error);
      throw error;
    }
  },

  /** 
    * Call to get status table data:
    * 1. Call for CRUD operation 
    * 2. Get confirmation & participants for month
    * 3. 
    * 
    * @param {month} input
    */
  getStatusTableData: async (start, end) => {
    try {
      const result = await ipcRenderer.invoke('db-getStatusTableData', start, end);
      return result;
    } catch (error) {
      console.error('preload.js error in db-getStatusTableData:', error);
      throw error;
    }
  },

}); 