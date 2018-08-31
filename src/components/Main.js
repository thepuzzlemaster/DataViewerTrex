import React from 'react';
import { Button, Glyphicon, Modal } from 'react-bootstrap';

import DataTableComponent from './DataTableComponent';
import LoadingIndicatorComponent from './LoadingIndicatorComponent';
import DatasourceListComponent from './DatasourceListComponent';

require('normalize.css/normalize.css');
require('styles/App.css');

// Declare this so our linter knows that tableau is a global object
/* global tableau */

class AppComponent extends React.Component {
  constructor (props) {
    super(props);
    this.state = {
      isLoading: true,
      worksheetNames: [],
      rows: [],
      headers: [],
      dataKey: 1,
      filteredFields: []
    };

    this.unregisterEventFn = undefined;
    this.dashboardWorksheets = {};
  }

  componentWillMount () {
      tableau.extensions.initializeAsync().then(() => {
          const selectedWorksheet = tableau.extensions.settings.get('worksheet');
          const dashboard = tableau.extensions.dashboardContent.dashboard;
          const worksheetSelected = !!selectedWorksheet;
          let worksheetNames = [];
          this.setState({
              isLoading: worksheetSelected,
              selectedWorksheet: selectedWorksheet
          });

          dashboard.worksheets.forEach(worksheet => {
              if (!this.dashboardWorksheets[worksheet.name]) { // only add if not already there
                  this.dashboardWorksheets[worksheet.name] = worksheet;
                  worksheetNames.push(worksheet.name);
              }
          });

          this.setState({
              isLoading: false,
              worksheetNames: worksheetNames
          });
      });
  }

  getSelectedSheet (selectedSheet) {
    const sheetName = selectedSheet || this.state.selectedWorksheet;
    return tableau.extensions.dashboardContent.dashboard.worksheets.find(worksheet => worksheet.name === sheetName);
  }

  onSelectWorksheet (worksheetName) {
    tableau.extensions.settings.set('worksheet', worksheetName);
    this.setState({ isLoading: true });
    tableau.extensions.settings.saveAsync().then(() => {
      this.setState({ selectedWorksheet: worksheetName, filteredFields: [] }, this.loadSelectedData.bind(this));
    });
  }

  loadSelectedData () {
    if (this.unregisterEventFn) {
      this.unregisterEventFn();
    }

    const worksheet = this.dashboardWorksheets[this.state.selectedWorksheet];
    worksheet.getSummaryDataAsync().then(returnedData => {

      console.log(returnedData, 'DATA')
      const rows = returnedData.data.map(row => row.map(cell => cell.formattedValue));
      const headers = returnedData.columns.map(column => column.fieldName);

      this.setState({
        rows: rows,
        headers: headers,
        dataKey: Date.now(),
        isLoading: false
      })

      this.forceUpdate()
    })

    // this.unregisterEventFn = dashboard.addEventListener(tableau.TableauEventType.MarkSelectionChanged, () => {
    //   this.setState({ isLoading: true });
    //   this.loadSelectedData();
    // });
  }

  onHeaderClicked (fieldName) {
    const headerIndex = this.state.headers.indexOf(fieldName);
    const columnData = this.state.rows.map(row => row[headerIndex]);
    const columnDomain = columnData.filter((value, index, self) => {
      return self.indexOf(value) === index;
    });

    const worksheet = this.getSelectedSheet();
    this.setState({ isLoading: true });
    worksheet.applyFilterAsync(fieldName, columnDomain, tableau.FilterUpdateType.Replace).then(() => {
      const updatedFilteredFields = this.state.filteredFields;
      updatedFilteredFields.push(fieldName);
      this.setState({ filteredFields: updatedFilteredFields, isLoading: false });
    });
  }

  onResetFilters () {
    const worksheet = this.getSelectedSheet();
    this.setState({ isLoading: true });
    const promises = this.state.filteredFields.map(fieldName => worksheet.clearFilterAsync(fieldName));
    Promise.all(promises).then(() => {
      this.setState({ filteredFields: [], isLoading: false });
    });
  }

  render () {
    if (this.state.isLoading) {
      return (<LoadingIndicatorComponent msg='Loading' />);
    }

    if (!this.state.selectedWorksheet) {
      return (
        <Modal show={true}>
          <Modal.Header>
            <Modal.Title>Choose a Worksheet</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <DatasourceListComponent worksheetNames={this.state.worksheetNames} onSelectWorksheet={this.onSelectWorksheet.bind(this)} />
          </Modal.Body>
        </Modal>);
    }

    const mainContent = this.state.rows.length > 0
      ? (<DataTableComponent rows={this.state.rows} headers={this.state.headers} dataKey={this.state.dataKey} onHeaderClicked={this.onHeaderClicked.bind(this)} />)
      : (<h4>No data found</h4>);

    return (
      <div>
        <div className='summary_header'>
          <h4>
          Data for <span className='sheet_name'>{this.state.selectedWorksheet}</span>
            <Button bsStyle='link' onClick={() => this.setState({ selectedWorksheet: undefined })}><Glyphicon glyph='cog' /></Button>
            <Button bsStyle='link' onClick={this.onResetFilters.bind(this)} disabled={this.state.filteredFields.length === 0}><Glyphicon glyph='repeat' /></Button>
          </h4>
        </div>
        {mainContent}
      </div>
    );
  }
}

export default AppComponent;
