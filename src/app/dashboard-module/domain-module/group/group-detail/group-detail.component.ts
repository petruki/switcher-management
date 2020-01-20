import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { DomainRouteService } from '../../../services/domain-route.service';
import { PathRoute, Types } from '../../model/path-route';
import { Group } from '../../model/group';
import { map, takeUntil } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { DetailComponent } from '../../common/detail-component';
import { AdminService } from 'src/app/dashboard-module/services/admin.service';
import { EnvironmentConfigComponent } from '../../environment-config/environment-config.component';

@Component({
  selector: 'app-group-detail',
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.css']
})
export class GroupDetailComponent extends DetailComponent implements OnInit, OnDestroy {
  private unsubscribe: Subject<void> = new Subject();

  @ViewChild('envSelectionChange', { static: true })
  private envSelectionChange: EnvironmentConfigComponent;

  constructor(
    private domainRouteService: DomainRouteService,
    private adminService: AdminService,
    private pathRoute: PathRoute,
    private route: ActivatedRoute
  ) { 
    super(adminService);
  }

  ngOnInit() {
    this.route.paramMap
    .pipe(takeUntil(this.unsubscribe), map(() => window.history.state)).subscribe(data => {
      if (data.element) {
        this.updatePathRoute(JSON.parse(data.element));
      } else {
        this.updatePathRoute(this.domainRouteService.getPathElement(Types.SELECTED_GROUP).element);
      }
    });

    this.envSelectionChange.statusChanged.pipe(takeUntil(this.unsubscribe)).subscribe(status => {
      this.updateStatus(status);
    });

    super.loadAdmin(this.getGroup().owner);
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  updatePathRoute(group: Group) {
    this.pathRoute = {
      id: group.id,
      element: group,
      name: group.name,
      path: '/dashboard/domain/group/detail',
      type: Types.GROUP_TYPE
    };

    this.domainRouteService.updatePath(this.pathRoute);
  }

  updateStatus(status: boolean): void {
    this.currentStatus = status;

    if (this.editing) {
      this.classStatus = 'header editing';
    } else {
      this.classStatus = this.currentStatus ? 'header activated' : 'header deactivated';
    }
  }

  getGroup() {
    return this.pathRoute.element;
  }

  edit() {
    this.editing = !this.editing;

    if (this.editing) {
      this.classStatus = 'header editing';
    } else {
      this.classStatus = this.currentStatus ? 'header activated' : 'header deactivated';
    }
  }

}
