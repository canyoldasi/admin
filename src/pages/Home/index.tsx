import React from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import BalanceOverview from '../DashboardCrm/BalanceOverview';
import ClosingDeals from '../DashboardCrm/ClosingDeals';
import DealsStatus from '../DashboardCrm/DealsStatus';
import DealType from '../DashboardCrm/DealType';
import MyTasks from '../DashboardCrm/MyTasks';
import SalesForecast from '../DashboardCrm/SalesForecast';
import UpcomingActivities from '../DashboardCrm/UpcomingActivities';
import Widgets from '../DashboardCrm/Widgets';
import ReactApexChart from "react-apexcharts";
import getChartColorsArray from "../../Components/Common/ChartsDynamicColor";

const BasicLineChart = () => {
    var linechartBasicColors = getChartColorsArray('["--vz-primary"]');
    const series = [{
        name: "TL",
        data: [50000,100000,150000,200000,200000,300000,125000,400000,450000,132123,550000,600000,432134,700000,750000,20000,850000,471234,950000,1000000,50000,100000,150000,200000,200000,300000,125000,400000,450000,132123]
    }];
    var options = {
        chart: {
            height: 350,
            type: 'line',
            zoom: {
                enabled: false
            },
            toolbar: {
                show: false
            }
        },
        markers: {
            size: 4,
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'straight'
        },
        colors: linechartBasicColors,
        title: {
            text: '',
            align: 'left',
            style: {
                fontWeight: 500,
            },
        },
        tooltip: {
            y: {
                formatter: function (val: any) {
                    return val.toLocaleString('tr-TR') + " ₺"
                }
            }
        },
        yaxis: {
            labels: {
                formatter: function (val: any) {
                    return val.toLocaleString('tr-TR') + " ₺"
                }
            }
        },
        xaxis: {
            categories: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30'],
        }
    };

    return (
        <React.Fragment>
            <ReactApexChart dir="ltr"
                options={options}
                series={series}
                type="line"
                height="350"
                className="apex-charts"
            />
        </React.Fragment>
    );
};

const Home = () => {
    document.title="Ana Sayfa | Can Yoldaşı Derneği";
    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>                            
                    <BreadCrumb title="Ana Sayfa" pageTitle="Dashboards" />
                    <Row>
                        <Widgets />
                    </Row>
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader>
                                    <h4 className="card-title mb-0">Günlere Göre Yapılan Bağışlar (₺)</h4>
                                </CardHeader>
                                <CardBody>
                                    <BasicLineChart />
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                    <Row>
                        <SalesForecast />
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default Home; 