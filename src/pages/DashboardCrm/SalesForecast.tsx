import React, { useState, useEffect } from 'react';
import { Card, CardHeader, Col, DropdownItem, DropdownMenu, DropdownToggle, UncontrolledDropdown } from 'reactstrap';
import { SalesForecastCharts } from './DashboardCrmCharts';
import { useSelector, useDispatch } from "react-redux";
import { getSalesChartsData } from '../../slices/thunks';
import { createSelector } from 'reselect';


const SalesForecast = () => {const dispatch = useDispatch<any>();

    const [chartData, setchartData] = useState<any>([]);

    const selectDashboardData = createSelector(
        (state) => state.DashboardCRM,
        (salesForecastData) => salesForecastData.salesForecastData
      );
    // Inside your component
    const salesForecastData = useSelector(selectDashboardData);

    useEffect(() => {
        setchartData(salesForecastData);
    }, [salesForecastData]);

    const [seletedMonth, setSeletedMonth] = useState("Nov 2021");
    const onChangeChartPeriod = (pType: any) => {
        setSeletedMonth(pType);
        dispatch(getSalesChartsData(pType));
    };

    useEffect(() => {
        dispatch(getSalesChartsData("nov"));
    }, [dispatch]);

    return (
        <React.Fragment>
            <Col xxl={12} md={12}>
                <Card>
                    <CardHeader className="align-items-center d-flex">
                        <h4 className="card-title mb-0 flex-grow-1">Aylık Bağışlar</h4>
                        <div className="flex-shrink-0">
                            <UncontrolledDropdown className="card-header-dropdown">
                                <DropdownToggle tag="a" className="text-reset dropdown-btn" role="button">
                                    <span className="fw-semibold text-uppercase fs-12">Tarih: </span><span className="text-muted">{seletedMonth.charAt(0).toUpperCase() + seletedMonth.slice(1)}<i className="mdi mdi-chevron-down ms-1"></i></span>
                                </DropdownToggle>
                                <DropdownMenu className="dropdown-menu-start">
                                    <DropdownItem onClick={() => { onChangeChartPeriod("oct"); }} className={seletedMonth === "oct" ? "active" : ""}>2025</DropdownItem>
                                    <DropdownItem onClick={() => { onChangeChartPeriod("nov"); }} className={seletedMonth === "nov" ? "active" : ""}>2024</DropdownItem>
                                </DropdownMenu>
                            </UncontrolledDropdown>
                        </div>
                    </CardHeader>
                    <div className="card-body pb-0">
                        <div id="sales-forecast-chart" className="apex-charts" dir="ltr">
                            <SalesForecastCharts series={chartData} dataColors='["--vz-primary", "--vz-success", "--vz-danger"]' />
                        </div>
                    </div>
                </Card>
            </Col>
        </React.Fragment>
    );
};

export default SalesForecast;