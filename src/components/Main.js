import React from 'react';
import { ContextMenu, MenuItem } from 'react-contextmenu';
import { Button, Glyphicon, Modal } from 'react-bootstrap';
import { DataGrid, IndexBasedGridSelection, SelectionBehavior } from '@tableau/widgets-datagrid';

import LoadingIndicatorComponent from './LoadingIndicatorComponent';
import DatasourceListComponent from './DatasourceListComponent';
import { CellFormatterFactory } from './CellFormatter';

require('normalize.css/normalize.css');
require('styles/App.scss');
require('styles/React-contextmenu.scss');
require('styles/Datagrid.scss');

// Declare this so our linter knows that tableau is a global object
/* global tableau */

class AppComponent extends React.Component {
  selection;

  constructor (props) {
    super(props);
    this.state = {
      isLoading: true,
      datasourceNames: [],
      rows: [],
      headers: [],
      dataKey: 1,
      filteredFields: []
    };

    this.unregisterEventFn = undefined;
    this.dataSourceFetchPromises = [];
    this.dashboardDataSources = {};
  }

  getRowStore = () => {
    return {
      getItems: (start, end, rowHandler) => {
        rowHandler(this.state.rows);
      }
    }
  }

  componentWillMount = () => {
    tableau.extensions.initializeAsync().then(() => {
      const selectedDatasource = tableau.extensions.settings.get('datasource');
      const dashboard = tableau.extensions.dashboardContent.dashboard;
      const datasourceSelected = !!selectedDatasource;
      let dataSourceNames = [];
      this.setState({
        isLoading: datasourceSelected,
        selectedDatasource: selectedDatasource
      });

      dashboard.worksheets.forEach(worksheet => {
        this.dataSourceFetchPromises.push(worksheet.getDataSourcesAsync());
      });

      Promise.all(this.dataSourceFetchPromises).then(fetchResults => {
        fetchResults.forEach(dataSourcesForWorksheet => {
          dataSourcesForWorksheet.forEach(dataSource => {
            if (!this.dashboardDataSources[dataSource.name]) { // only add if not already there
              this.dashboardDataSources[dataSource.name] = dataSource;
              dataSourceNames.push(dataSource.name);
            }
          });
        });

        this.setState({
          isLoading: false,
          datasourceNames: dataSourceNames
        });

        if (datasourceSelected) {
          this.loadSelectedData();
        }
      });
    });
  }

  getSelectedSheet (selectedSheet) {
    const sheetName = selectedSheet || this.state.selectedDatasource;
    return tableau.extensions.dashboardContent.dashboard.worksheets.find(worksheet => worksheet.name === sheetName);
  }

  onSelectDatasource = (datasourceName) => {
    tableau.extensions.settings.set('datasource', datasourceName);
    this.setState({ isLoading: true });
    tableau.extensions.settings.saveAsync().then(() => {
      this.setState({ selectedDatasource: datasourceName, filteredFields: [] }, this.loadSelectedData);
    });
  }

  loadSelectedData () {
    if (this.unregisterEventFn) {
      this.unregisterEventFn();
    }

    const datasource = this.dashboardDataSources[this.state.selectedDatasource];
    datasource.getUnderlyingDataAsync().then(returnedData => {

      const headers = returnedData.columns.map(column => {
        return {
          headerText: column.fieldName,
          dataKey: column.fieldName,
          name: column.fieldName,
          cellFormatter: CellFormatterFactory
        }
      });

      const rows = returnedData.data.map((row, rowIndex) => {
        let mappedRow = {
          data: {},
          key: rowIndex
        };

        row.forEach((cell, cellIndex) => {
          let fieldName = (headers[cellIndex] && headers[cellIndex].headerText) || '';
          let value = cell.formattedValue;
          mappedRow.data[fieldName] = value;
        });
        return mappedRow
      });

      this.setState({
        rows: rows,
        headers: headers,
        dataKey: Date.now(),
        isLoading: false
      })

      this.selection = new IndexBasedGridSelection(this.state.rows.length, this.state.headers.length);
      this.selection.SelectionBehavior = SelectionBehavior.SelectCell;

      this.forceUpdate()
    })

    // this.unregisterEventFn = dashboard.addEventListener(tableau.TableauEventType.MarkSelectionChanged, () => {
    //   this.setState({ isLoading: true });
    //   this.loadSelectedData();
    // });
  }

  handleSelectionEvent = (event) => {
    const result = this.selection && this.selection.handleSelectionEvent(event);
    return result;
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

  handleCopy (event, data, target) {
    console.log('handleCopy', event, data, target);
  }

  render = () => {
    if (this.state.isLoading) {
      return (<LoadingIndicatorComponent msg='Loading' />);
    }

    if (!this.state.selectedDatasource) {
      return (
        <Modal show={true}>
          <Modal.Header>
            <Modal.Title>Choose a Data Source</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <DatasourceListComponent datasourceNames={this.state.datasourceNames} onSelectDatasource={this.onSelectDatasource} />
          </Modal.Body>
        </Modal>);
    }

    const gridProps = {
      cols: this.state.headers,
      rowStore: this.getRowStore(),
      onSelectionEvent: this.handleSelectionEvent,
      selectionModel: this.selection,
      showHeaders: true,
      showRowBanding: true,
      showRowHeaders: true,
      showVerticalGridLines: true
    };

    const mainContent = this.state.rows.length > 0
      // ? (<DataTableComponent rows={this.state.rows} headers={this.state.headers} dataKey={this.state.dataKey} onHeaderClicked={this.onHeaderClicked.bind(this)} />)
      ? (<DataGrid.element {...gridProps} />)
      : (<h4>No data found</h4>);

    return (
      <div>
        <div className='summary_header'>
          <h4>
          Data for <span className='sheet_name'>{this.state.selectedDatasource}</span>
            <Button bsStyle='link' onClick={() => this.setState({ selectedDatasource: undefined })}><Glyphicon glyph='cog' /></Button>
            <Button bsStyle='link' onClick={this.onResetFilters.bind(this)} disabled={this.state.filteredFields.length === 0}><Glyphicon glyph='repeat' /></Button>
          </h4>
        </div>
        {mainContent}
        <ContextMenu id='copyMenu'>
          <MenuItem onClick={this.handleCopy}>Copy</MenuItem>
        </ContextMenu>
      </div>
    );
  }
}

export default AppComponent;
