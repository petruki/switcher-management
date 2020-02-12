import { Component, OnInit, OnDestroy, ViewChild, Input } from '@angular/core';
import { DomainRouteService } from '../../services/domain-route.service';
import { Subject } from 'rxjs';
import { Types, PathRoute } from '../model/path-route';
import { DomainService } from '../../services/domain.service';
import { takeUntil } from 'rxjs/operators';
import { trigger, state, style } from '@angular/animations';
import { History } from '../model/history';
import { MatTableDataSource, MatSort, MatPaginator } from '@angular/material';
import { ToastService } from 'src/app/_helpers/toast.service';
import { GroupService } from '../../services/group.service';
import { ConfigService } from '../../services/config.service';
import { StrategyService } from '../../services/strategy.service';
import { Strategy } from '../model/strategy';
import { ConsoleLogger } from 'src/app/_helpers/console-logger';
import { DatePipe } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgbdModalConfirm } from 'src/app/_helpers/confirmation-dialog';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-changelog',
  templateUrl: './changelog.component.html',
  styleUrls: [
    '../common/css/detail.component.css',
    './changelog.component.css'
  ],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' }))
    ]),
  ],
})
export class ChangelogComponent implements OnInit, OnDestroy {
  private unsubscribe: Subject<void> = new Subject();

  @Input() strategy: Strategy;
  currentPathRoute: PathRoute;
  removable: boolean = true;

  @ViewChild(MatSort, { static: true }) sort: MatSort;
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  
  dataSource: MatTableDataSource<History>;
  dataColumns = ['newValue', 'date', 'updatedBy'];
  columnsToDisplay = [
    {
      data: 'newValue',
      display: 'Change'
    },
    {
      data: 'date',
      display: 'Date'
    },
    {
      data: 'updatedBy',
      display: 'Updated By'
    }
  ];
  expandedElement: History | null;

  constructor(
    private adminService: AdminService,
    private domainRouteService: DomainRouteService,
    private domainService: DomainService,
    private groupService: GroupService,
    private configService: ConfigService,
    private strategyService: StrategyService,
    private toastService: ToastService,
    private _modalService: NgbModal,
    private datepipe: DatePipe
  ) { }

  ngOnInit() {
    this.loadChangeLog();
    this.readPermissionToObject();
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  readPermissionToObject(): void {
    const domain = this.domainRouteService.getPathElement(Types.SELECTED_DOMAIN);
    this.adminService.readCollabPermission(domain.id, ['DELETE'], 'ADMIN', 'name', domain.name)
      .pipe(takeUntil(this.unsubscribe)).subscribe(data => {
      if (data.length) {
        data.forEach(element => {
          if (element.action === 'DELETE') {
            this.removable = element.result === 'ok' ? true : false;
          }
        });
      }
    });
  }

  loadChangeLog(): void {
    this.currentPathRoute = this.domainRouteService.getPathElement(Types.CURRENT_ROUTE);

    if (this.currentPathRoute.type === Types.DOMAIN_TYPE) {
      this.loadDomainHistory(this.currentPathRoute);
    } else if (this.currentPathRoute.type === Types.GROUP_TYPE) {
      this.loadGroupHistory(this.currentPathRoute);
    } else if (this.strategy) {
      this.loadStrategyHistory(this.strategy);
    } else if (this.currentPathRoute.type === Types.CONFIG_TYPE) {
      this.loadConfigHistory(this.currentPathRoute);
    }
  }

  loadDomainHistory(pathRouteSelection: PathRoute): void {
    this.domainService.getHistory(pathRouteSelection.id).pipe(takeUntil(this.unsubscribe)).subscribe(data => {
      if (data) {
        this.loadDataSource(data);
      }
    }, error => {
      ConsoleLogger.printError(error);
      this.toastService.showError(`Unable to load Domain Change Log`);
    });
  }

  loadGroupHistory(pathRouteSelection: PathRoute): void {
    this.groupService.getHistory(pathRouteSelection.id).pipe(takeUntil(this.unsubscribe)).subscribe(data => {
      if (data) {
        this.loadDataSource(data);
      }
    }, error => {
      ConsoleLogger.printError(error);
      this.toastService.showError(`Unable to load Group Change Log`);
    });
  }

  loadConfigHistory(pathRouteSelection: PathRoute): void {
    this.configService.getHistory(pathRouteSelection.id).pipe(takeUntil(this.unsubscribe)).subscribe(data => {
      if (data) {
        this.loadDataSource(data);
      }
    }, error => {
      ConsoleLogger.printError(error);
      this.toastService.showError(`Unable to load Switcher Change Log`);
    });
  }

  loadStrategyHistory(selectedStrategy: Strategy): void {
    this.strategyService.getHistory(selectedStrategy.id).pipe(takeUntil(this.unsubscribe)).subscribe(data => {
      if (data) {
        this.loadDataSource(data);
      }
    }, error => {
      ConsoleLogger.printError(error);
      this.toastService.showError(`Unable to load Strategy Change Log`);
    });
  }

  loadDataSource(data: History[]): void {
    this.dataSource = new MatTableDataSource(data);
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.dataSource.filterPredicate = (data: History, filter: string) => {
      return this.customFilterPredicate(data, filter);
    };
  }

  resetDomainChangeLog(): void {
    this.domainService.resetHistory(this.currentPathRoute.id).pipe(takeUntil(this.unsubscribe)).subscribe(data => {
      if (data) {
        this.dataSource = new MatTableDataSource(null);
        this.toastService.showSuccess(`Change Log reseted with success`);
      }
    }, error => {
        this.toastService.showError(`Unable to reset the Change Log`);
        ConsoleLogger.printError(error);
    })
  }

  resetGroupChangeLog(): void {
    this.groupService.resetHistory(this.currentPathRoute.id).pipe(takeUntil(this.unsubscribe)).subscribe(data => {
      if (data) {
        this.dataSource = new MatTableDataSource(null);
        this.toastService.showSuccess(`Change Log reseted with success`);
      }
    }, error => {
        this.toastService.showError(`Unable to reset the Change Log`);
        ConsoleLogger.printError(error);
    })
  }

  resetConfigChangeLog(): void {
    this.configService.resetHistory(this.currentPathRoute.id).pipe(takeUntil(this.unsubscribe)).subscribe(data => {
      if (data) {
        this.dataSource = new MatTableDataSource(null);
        this.toastService.showSuccess(`Change Log reseted with success`);
      }
    }, error => {
        this.toastService.showError(`Unable to reset the Change Log`);
        ConsoleLogger.printError(error);
    })
  }

  resetStrategyChangeLog(): void {
    this.strategyService.resetHistory(this.strategy.id).pipe(takeUntil(this.unsubscribe)).subscribe(data => {
      if (data) {
        this.dataSource = new MatTableDataSource(null);
        this.toastService.showSuccess(`Change Log reseted with success`);
      }
    }, error => {
        this.toastService.showError(`Unable to reset the Change Log`);
        ConsoleLogger.printError(error);
    })
  }

  customFilterPredicate(data: History, filter: string): boolean {
    if (data.updatedBy.indexOf(filter) >= 0) {
      return true;
    } else if (data.date.toString().indexOf(filter) >= 0) {
      return true;
    } else {
      return Object.keys(data.newValue).filter(key => key.indexOf(filter) >= 0).length > 0;
    }
  }

  getColumnLabel(dataColumn: string): string {
    return this.columnsToDisplay.filter(column => column.data === dataColumn)[0].display;
  }

  getElementKeys(element: any): string[] {
    return Object.keys(element);
  }

  getElementValue(key: string, element: any): string {
    return element[`${key}`] ? JSON.stringify(element[`${key}`]) : ' ';
  }

  formatResumedData(element: any): string {
    if (element instanceof Object) {
      const data: Map<string, any> = element;
      return Object.keys(data).join(' / ');
    }
    return element;
  }

  formatExpandedData(element: any): string {
    if (element instanceof Object) {
      return element != undefined ? JSON.stringify(element) : '';
    }
    return element;
  }

  formatDateContent(value: string): string {
    if (window.screen.width < 380) {
      return this.datepipe.transform(value, 'yy/MM/dd HH:mm');
    }
    return value;
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  resetHistory() {
    const modalConfirmation = this._modalService.open(NgbdModalConfirm);
    modalConfirmation.componentInstance.title = 'Change Log Reset';
    modalConfirmation.componentInstance.question = 'Are you sure you want to reset the change log?';
    modalConfirmation.result.then((result) => {
      if (result) {
        if (this.currentPathRoute) {
          if (this.currentPathRoute.type === Types.DOMAIN_TYPE) {
            this.resetDomainChangeLog();
          } else if (this.currentPathRoute.type === Types.GROUP_TYPE) {
            this.resetGroupChangeLog();
          } else if (this.strategy) {
            this.resetStrategyChangeLog();
          } else if (this.currentPathRoute.type === Types.CONFIG_TYPE) {
            this.resetConfigChangeLog();
          }
        }
      }
    });
  }

}
