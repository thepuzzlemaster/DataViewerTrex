import React from 'react';
import { ContextMenu, MenuItem } from 'react-contextmenu';
import { Button, Glyphicon, Modal } from 'react-bootstrap';
import { DataGrid, IndexBasedGridSelection, SelectionBehavior } from '@tableau/widgets-datagrid';

import LoadingIndicatorComponent from './LoadingIndicatorComponent';
import ColumnListComponent from './ColumnListComponent';
import DatasourceListComponent from './DatasourceListComponent';
import { CopySelectionToClipboard } from './SelectionCopy';
import { CreateCollectionClone } from './utils';
import { CellFormatterFactory } from './CellFormatter';
import ContextMenuTrigger from 'react-contextmenu/modules/ContextMenuTrigger';

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
      isFiltering: false,
      isLoading: true,
      datasourceNames: [],
      rows: [],
      headers: [],
      headersCopy: [],
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

      const headers = returnedData.columns.map((column, index) => {
        return {
          id: index,
          headerText: column.fieldName,
          dataKey: column.fieldName,
          name: column.fieldName,
          cellFormatter: CellFormatterFactory,
          isVisible: true
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
        })
        return mappedRow
      })

      this.setState({
        rows: rows,
        headers: headers,
        dataKey: Date.now(),
        isLoading: false
      })

      // TODO get length of non-filtered headers
      this.selection = new IndexBasedGridSelection(this.state.rows.length, this.state.headers.length)
      this.selection.SelectionBehavior = SelectionBehavior.SelectCell

      this.forceUpdate()
    })

    // this.unregisterEventFn = dashboard.addEventListener(tableau.TableauEventType.MarkSelectionChanged, () => {
    //   this.setState({ isLoading: true });
    //   this.loadSelectedData();
    // });
  }

  handleSelectionEvent = (event) => {
    const result = this.selection && this.selection.handleSelectionEvent(event)
    return result
  }

  onHeaderClicked (fieldName) {
    const headerIndex = this.state.headers.indexOf(fieldName)
    const columnData = this.state.rows.map(row => row[headerIndex])
    const columnDomain = columnData.filter((value, index, self) => {
      return self.indexOf(value) === index
    })

    const worksheet = this.getSelectedSheet()
    this.setState({ isLoading: true })
    worksheet.applyFilterAsync(fieldName, columnDomain, tableau.FilterUpdateType.Replace).then(() => {
      const updatedFilteredFields = this.state.filteredFields
      updatedFilteredFields.push(fieldName)
      this.setState({ filteredFields: updatedFilteredFields, isLoading: false })
    })
  }

  onColumnToggled = (index) => {
    let headersCopy = this.state.headersCopy.slice()
    headersCopy[index].isVisible = !headersCopy[index].isVisible

    this.setState({headersCopy: headersCopy})
  }

  cancelFiltering = () => {
    this.setState({isFiltering: false})
  }

  saveFiltering = () => {
    this.setState({
      isFiltering: false,
      headers: CreateCollectionClone(this.state.headersCopy)
    })
  }

  onResetFilters () {
    const worksheet = this.getSelectedSheet();
    this.setState({ isLoading: true });
    const promises = this.state.filteredFields.map(fieldName => worksheet.clearFilterAsync(fieldName));
    Promise.all(promises).then(() => {
      this.setState({ filteredFields: [], isLoading: false });
    });
  }

  handleCopy = () => {
    const cellRanges = this.selection.selection.cellRanges;
    const {headers, rows} = this.state;

    CopySelectionToClipboard(cellRanges, headers, rows);
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

    if (this.state.isFiltering) {
      return (
        <Modal show={true} onHide={this.cancelFiltering}>
          <Modal.Header closeButton={true}>
            <Modal.Title>Select Columns to Display</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ColumnListComponent headersCopy={this.state.headersCopy} onColumnToggled={this.onColumnToggled}></ColumnListComponent>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.cancelFiltering}>Cancel</Button>
            <Button onClick={this.saveFiltering} bsStyle="primary">Save Changes</Button>
          </Modal.Footer>
        </Modal>
      );
    }

    const gridProps = {
      cols: this.state.headers.filter(header => header.isVisible),
      rowStore: this.getRowStore(),
      onSelectionEvent: this.handleSelectionEvent,
      selectionModel: this.selection,
      showHeaders: true,
      showRowBanding: true,
      showRowHeaders: true,
      showVerticalGridLines: true
    };

    const mainContent = this.state.rows.length > 0
      ? (<DataGrid.element {...gridProps} />)
      : (<h4>No data found</h4>);

    return (
      <div>
        <div className='summary_header'>
          <h4>
          Data for <span className='sheet_name'>{this.state.selectedDatasource}</span>
            <Button bsStyle='link' onClick={() => this.setState({ selectedDatasource: undefined })}><Glyphicon glyph='th-list' /></Button>
            <Button bsStyle='link' onClick={() => this.setState({ isFiltering: true, headersCopy: CreateCollectionClone(this.state.headers) })}><Glyphicon glyph='filter' /></Button>
          </h4>
        </div>
        {/* holdToDisplay needs to be set here to allow click events to propogate */}
        <ContextMenuTrigger id='copyMenu' holdToDisplay={-1}>
          {mainContent}
        </ContextMenuTrigger>

        <ContextMenu id='copyMenu'>
          <MenuItem onClick={this.handleCopy}>Copy</MenuItem>
        </ContextMenu>
      </div>
    );
  }
}

export default AppComponent;
