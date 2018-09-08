import React from 'react'
import { ContextMenu, MenuItem } from 'react-contextmenu'
import { Button, Glyphicon, Modal } from 'react-bootstrap'
import { DataGrid, IndexBasedGridSelection, SelectionBehavior } from '@tableau/widgets-datagrid'

import LoadingIndicatorComponent from './LoadingIndicatorComponent'
import ColumnListComponent from './ColumnListComponent'
import DatasourceListComponent from './DatasourceListComponent'
import { CopySelectionToClipboard } from './SelectionCopy'
import { CreateCollectionClone } from './utils'
import { CellFormatterFactory } from './CellFormatter'
import ContextMenuTrigger from 'react-contextmenu/modules/ContextMenuTrigger'

require('normalize.css/normalize.css')
require('styles/App.scss')
require('styles/React-contextmenu.scss')
require('styles/Datagrid.scss')

// Declare this so our linter knows that tableau is a global object
/* global tableau */


// TODO headers -> columns

class AppComponent extends React.Component {
  selection

  constructor (props) {
    super(props)
    this.state = {
      isFiltering: false,
      isLoading: true,
      datasourceNames: [],
      rows: [],
      headers: [],
      headersCopy: []
    }

    this.dataSourceFetchPromises = []
    this.dashboardWorksheets = {}
    this.dashboardDataSources = {}
  }

  getRowStore = () => {
    return {
      getItems: (start, end, rowHandler) => {
        rowHandler(this.state.rows)
      }
    }
  }

  componentWillMount = () => {
    tableau.extensions.initializeAsync().then(() => {
      const selectedDatasource = tableau.extensions.settings.get('datasource')
      const selectedWorksheet = tableau.extensions.settings.get('worksheet')
      const activeTab = tableau.extensions.settings.get('activeTab') || 'datasource'
      const dashboard = tableau.extensions.dashboardContent.dashboard
      const datasourceSelected = !!selectedDatasource
      const worksheetSelected = !!selectedWorksheet
      let dataSourceNames = []
      let worksheetNames = []
      let isLoading = datasourceSelected

      if (activeTab === 'worksheet') {
        isLoading = worksheetSelected
      }

      this.setState({
        isLoading: isLoading,
        selectedDatasource: selectedDatasource,
        selectedWorksheet: selectedWorksheet
      })

      dashboard.worksheets.forEach(worksheet => {
        this.dashboardWorksheets[worksheet.name] = worksheet
        worksheetNames.push(worksheet.name)

        this.dataSourceFetchPromises.push(worksheet.getDataSourcesAsync())
      })

      Promise.all(this.dataSourceFetchPromises).then(fetchResults => {
        fetchResults.forEach(dataSourcesForWorksheet => {
          dataSourcesForWorksheet.forEach(dataSource => {
            if (!this.dashboardDataSources[dataSource.name]) { // only add if not already there
              this.dashboardDataSources[dataSource.name] = dataSource
              dataSourceNames.push(dataSource.name)
            }
          })
        })

        this.setState({
          isLoading: false,
          datasourceNames: dataSourceNames,
          worksheetNames: worksheetNames
        })

        if (activeTab === 'datasource' && datasourceSelected) {
          this.loadSelectedDataSource()
        } else if (activeTab === 'worksheet' && worksheetSelected) {
          this.loadSelectedWorksheet()
        }
      })
    })
  }

  onSelectDatasource = (datasourceName) => {
    tableau.extensions.settings.set('datasource', datasourceName)
    tableau.extensions.settings.saveAsync().then(() => {
      this.setState({ selectedDatasource: datasourceName }, this.loadSelectedDataSource)
    })
  }

  onSelectWorksheet = (worksheetName) => {
    tableau.extensions.settings.set('worksheet', worksheetName)
    tableau.extensions.settings.saveAsync().then(() => {
      this.setState({ selectedWorksheet: worksheetName }, this.loadSelectedWorksheet)
    })
  }

  loadWorksheetOrDatasource = (type) => {
    let promise;

    tableau.extensions.settings.set('activeTab', type)
    this.setState({isLoading: true})

    if (type === 'worksheet') {
      const worksheet = this.dashboardWorksheets[this.state.selectedWorksheet]
      promise = worksheet.getSummaryDataAsync()
    } else if (type === 'datasource') {
      const datasource = this.dashboardDataSources[this.state.selectedDatasource]
      promise = datasource.getUnderlyingDataAsync()
    }

    promise.then(returnedData => {
      const formattedData = this.generateRowsAndColumns(returnedData)

      this.setState({
        rows: formattedData.rows,
        headers: formattedData.headers,
        isLoading: false
      })

      // TODO get length of non-filtered headers
      this.selection = new IndexBasedGridSelection(this.state.rows.length, this.state.headers.length)
      this.selection.SelectionBehavior = SelectionBehavior.SelectCell

      this.forceUpdate()
    })
  }

  loadSelectedWorksheet = () => {
    this.loadWorksheetOrDatasource('worksheet')
    tableau.extensions.settings.saveAsync().then(() => {
    })
  }

  loadSelectedDataSource = () => {
    this.loadWorksheetOrDatasource('datasource')
    tableau.extensions.settings.saveAsync().then(() => {
    })
  }

  generateRowsAndColumns = (returnedData) => {
    const headers = returnedData.columns.map((column, index) => {
      return {
        id: index,
        headerText: column.fieldName,
        dataKey: column.fieldName,
        name: column.fieldName,
        cellFormatter: CellFormatterFactory,
        isVisible: true
      }
    })

    const rows = returnedData.data.map((row, rowIndex) => {
      let mappedRow = {
        data: {},
        key: rowIndex
      }

      row.forEach((cell, cellIndex) => {
        let fieldName = (headers[cellIndex] && headers[cellIndex].headerText) || ''
        let value = cell.formattedValue
        mappedRow.data[fieldName] = value
      })
      return mappedRow
    })

    return {
      headers: headers,
      rows: rows
    }
  }

  handleSelectionEvent = (event) => {
    const result = this.selection && this.selection.handleSelectionEvent(event)
    return result
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

  handleCopy = () => {
    const cellRanges = this.selection.selection.cellRanges
    const {headers, rows} = this.state

    CopySelectionToClipboard(cellRanges, headers, rows)
  }

  renderWorksheetSelector = () => {
    return (
      <Modal show={true}>
        <Modal.Header>
          <Modal.Title>Choose a Worksheet</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <DatasourceListComponent datasourceNames={this.state.worksheetNames} onSelectDatasource={this.onSelectWorksheet} />
        </Modal.Body>
      </Modal>)
  }

  renderDataSourceSelector = () => {
    return (
      <Modal show={true}>
        <Modal.Header>
          <Modal.Title>Choose a Data Source</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <DatasourceListComponent datasourceNames={this.state.datasourceNames} onSelectDatasource={this.onSelectDatasource} />
        </Modal.Body>
      </Modal>)
  }

  renderColumnFilter = () => {
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
    )
  }

  renderDataGrid = () => {
    const gridProps = {
      cols: this.state.headers.filter(header => header.isVisible),
      rowStore: this.getRowStore(),
      onSelectionEvent: this.handleSelectionEvent,
      selectionModel: this.selection,
      showHeaders: true,
      showRowBanding: true,
      showRowHeaders: true,
      showVerticalGridLines: true
    }

    const mainContent = this.state.rows.length > 0
      ? (<DataGrid.element {...gridProps} />)
      : (<h4>No data found</h4>)

    const dataName = tableau.extensions.settings.get('activeTab') === 'datasource'
      ? this.state.selectedDatasource
      : this.state.selectedWorksheet

    return (
      <div>
        <div className='summary_header'>
          <h4>
          Data for <span className='sheet_name'>{dataName}</span>
            <Button bsStyle='link' onClick={() => this.setState({ selectedDatasource: undefined })}><Glyphicon glyph='hdd' title="Select Datasource" /></Button>
            <Button bsStyle='link' onClick={() => this.setState({ selectedWorksheet: undefined })}><Glyphicon glyph='stats' title="Select Worksheet" /></Button>
            <Button bsStyle='link' onClick={() => this.setState({ isFiltering: true, headersCopy: CreateCollectionClone(this.state.headers) })}><Glyphicon glyph='filter' title="Filter columns" /></Button>
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
    )
  }

  render = () => {
    if (this.state.isLoading) {
      return (<LoadingIndicatorComponent msg='Loading' />)
    }

    if (!this.state.selectedWorksheet) {
      return this.renderWorksheetSelector()
    }

    if (!this.state.selectedDatasource) {
      return this.renderDataSourceSelector()
    }

    if (this.state.isFiltering) {
      return this.renderColumnFilter()
    }

    return this.renderDataGrid()
  }
}

export default AppComponent
